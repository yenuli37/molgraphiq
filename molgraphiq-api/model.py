"""
MolGraphIQ Backend — model.py
Exact GINEConv architecture matching the trained checkpoint keys.

Checkpoint structure confirmed by inspection:
  node_encoder: [hidden_dim, node_feat_dim]
  edge_encoder: [hidden_dim, edge_feat_dim]
  convs.{0-4}.eps, .nn.0/2, .lin (GINEConv layout)
  batch_norms.{0-4}
  readout.*  (SetTransformer — ONLY for regression models)
  primary_head: Linear(hidden_dim, hidden_dim//2) + ReLU + Dropout + Linear(hidden_dim//2, n_tasks)
  auxiliary_head: same layout, output 82
"""

import torch
import torch.nn as nn
import torch.nn.functional as F
from torch_geometric.nn import GINEConv, global_mean_pool


# ──────────────────────────────────────────────────────────────
# Set Transformer building blocks (regression models only)
# ──────────────────────────────────────────────────────────────

class MAB(nn.Module):
    """Multihead Attention Block (Set Transformer)."""

    def __init__(self, dim: int, heads: int):
        super().__init__()
        self.attn = nn.MultiheadAttention(dim, heads, batch_first=True)
        self.lin = nn.Linear(dim, dim)

    def forward(self, Q: torch.Tensor, K: torch.Tensor) -> torch.Tensor:
        out, _ = self.attn(Q, K, K)
        return F.relu(self.lin(out + Q))


class SAB(nn.Module):
    """Set Attention Block (self-attention over set)."""

    def __init__(self, dim: int, heads: int):
        super().__init__()
        self.mab = MAB(dim, heads)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.mab(x, x)


class PMA(nn.Module):
    """Pooling by Multihead Attention (seed-point aggregation)."""

    def __init__(self, dim: int, num_seeds: int, heads: int):
        super().__init__()
        self.seed = nn.Parameter(torch.randn(1, num_seeds, dim))
        self.lin = nn.Linear(dim, dim)
        self.mab = MAB(dim, heads)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        seeds = self.seed.expand(x.size(0), -1, -1)
        seeds = F.relu(self.lin(seeds))
        return self.mab(seeds, x)


class SetTransformerReadout(nn.Module):
    """
    Set Transformer readout: 2 SAB encoders + PMA + 1 SAB decoder.
    Takes per-node embeddings, groups them per graph, returns graph embedding.

    Key names in checkpoint:
      readout.encoders.{0,1}.mab.*
      readout.pma.seed, readout.pma.lin.*, readout.pma.mab.*
      readout.decoders.0.mab.*
    """

    def __init__(self, dim: int, num_encoder_blocks: int, num_decoder_blocks: int,
                 num_seed_points: int, heads: int):
        super().__init__()
        self.encoders = nn.ModuleList([SAB(dim, heads) for _ in range(num_encoder_blocks)])
        self.pma = PMA(dim, num_seed_points, heads)
        self.decoders = nn.ModuleList([SAB(dim, heads) for _ in range(num_decoder_blocks)])

    def forward(self, x: torch.Tensor, batch: torch.Tensor) -> torch.Tensor:
        """
        x     : [N_total_atoms, dim]
        batch : [N_total_atoms]  long indices per graph
        returns: [B, dim]
        """
        B = int(batch.max().item()) + 1
        max_nodes = int((batch == batch.bincount().argmax()).sum().item())
        # Pad to max_nodes per graph
        n_per_graph = batch.bincount()
        max_n = int(n_per_graph.max().item())

        padded = torch.zeros(B, max_n, x.size(-1), device=x.device)
        ptr = 0
        for g in range(B):
            n = int(n_per_graph[g].item())
            padded[g, :n] = x[ptr:ptr + n]
            ptr += n

        h = padded
        for enc in self.encoders:
            h = enc(h)
        h = self.pma(h)  # [B, num_seeds, dim]
        for dec in self.decoders:
            h = dec(h)
        return h[:, 0, :]  # [B, dim]  — first (only) seed


# ──────────────────────────────────────────────────────────────
# Main MolGraphIQ model
# ──────────────────────────────────────────────────────────────

class MolGraphIQ(nn.Module):
    """
    GIN with GINEConv layers matching trained checkpoint structure.

    Args:
        node_feat_dim  : input node feature dim (30)
        edge_feat_dim  : input edge feature dim (11)
        hidden_dim     : GIN hidden dim (300)
        num_layers     : number of GINEConv layers (5)
        n_tasks        : primary output dim
        use_set_transformer : if True, use SetTransformer readout (regression)
        use_auxiliary  : if True, include auxiliary_head (82 outputs)
        num_fg         : functional-group auxiliary output dim (82)
        num_seeds      : SetTransformer seed points (1)
        num_enc_blocks : SetTransformer encoder SAB blocks (2)
        num_dec_blocks : SetTransformer decoder SAB blocks (1)
        st_heads       : SetTransformer attention heads (4)
    """

    def __init__(
        self,
        node_feat_dim: int = 30,
        edge_feat_dim: int = 11,
        hidden_dim: int = 300,
        num_layers: int = 5,
        n_tasks: int = 1,
        use_set_transformer: bool = True,
        use_auxiliary: bool = True,
        num_fg: int = 82,
        num_seeds: int = 1,
        num_enc_blocks: int = 2,
        num_dec_blocks: int = 1,
        st_heads: int = 4,
    ):
        super().__init__()

        self.hidden_dim = hidden_dim
        self.num_layers = num_layers
        self.use_set_transformer = use_set_transformer

        # Node / edge encoders (linear projections to hidden_dim)
        self.node_encoder = nn.Linear(node_feat_dim, hidden_dim)
        self.edge_encoder = nn.Linear(edge_feat_dim, hidden_dim)

        # GINEConv layers
        # Checkpoint was saved with GINEConv(edge_dim=hidden_dim), which creates
        # an internal .lin projection for edge features — matches convs.*.lin.* keys.
        # MLP keys: nn.0 (Linear→2*hd), nn.2 (Linear→hd) — no BatchNorm inside MLP.
        self.convs = nn.ModuleList()
        for _ in range(num_layers):
            mlp = nn.Sequential(
                nn.Linear(hidden_dim, hidden_dim * 2),  # nn.0
                nn.ReLU(),                               # nn.1 (activation, no saved params)
                nn.Linear(hidden_dim * 2, hidden_dim),  # nn.2
            )
            self.convs.append(GINEConv(mlp, train_eps=True, edge_dim=hidden_dim))

        self.batch_norms = nn.ModuleList([
            nn.BatchNorm1d(hidden_dim) for _ in range(num_layers)
        ])

        # Readout
        if use_set_transformer:
            self.readout = SetTransformerReadout(
                dim=hidden_dim,
                num_encoder_blocks=num_enc_blocks,
                num_decoder_blocks=num_dec_blocks,
                num_seed_points=num_seeds,
                heads=st_heads,
            )

        half = hidden_dim // 2

        # Primary task head: Linear → ReLU → Dropout → Linear
        self.primary_head = nn.Sequential(
            nn.Linear(hidden_dim, half),
            nn.ReLU(),
            nn.Dropout(0.1),
            nn.Linear(half, n_tasks),
        )

        # Auxiliary head (functional group): same shape
        if use_auxiliary:
            self.auxiliary_head = nn.Sequential(
                nn.Linear(hidden_dim, half),
                nn.ReLU(),
                nn.Dropout(0.1),
                nn.Linear(half, num_fg),
            )

    def forward(
        self,
        x: torch.Tensor,
        edge_index: torch.Tensor,
        edge_attr: torch.Tensor,
        batch: torch.Tensor,
    ):
        """
        Args:
            x          : [N, node_feat_dim]
            edge_index : [2, E]
            edge_attr  : [E, edge_feat_dim]
            batch      : [N] graph membership indices

        Returns:
            primary_out : [B, n_tasks]
            aux_out     : [B, num_fg]  or None if no auxiliary head
            graph_repr  : [B, hidden_dim]
        """
        h = self.node_encoder(x)
        ea = self.edge_encoder(edge_attr)

        for i in range(self.num_layers):
            h = self.convs[i](h, edge_index, ea)
            h = self.batch_norms[i](h)
            h = F.relu(h)

        if self.use_set_transformer:
            graph_repr = self.readout(h, batch)
        else:
            graph_repr = global_mean_pool(h, batch)

        primary_out = self.primary_head(graph_repr)
        aux_out = self.auxiliary_head(graph_repr) if hasattr(self, "auxiliary_head") else None

        return primary_out, aux_out, graph_repr
