# solver/grid.py
from __future__ import annotations
from dataclasses import dataclass, field
from typing import List, Set, Tuple

Pos = Tuple[int, ...]  # (row, col) for 2D; (row, col, alt) for 3D


@dataclass
class Grid:
    rows: int
    cols: int
    alts: int = 1
    obstacles: Set[Pos] = field(default_factory=set)
    _nofly: Set[Pos] = field(default_factory=set)

    @property
    def positions(self) -> List[Pos]:
        blocked = self.obstacles | self._nofly
        if self.alts == 1:
            return [
                (r, c)
                for r in range(self.rows)
                for c in range(self.cols)
                if (r, c) not in blocked
            ]
        return [
            (r, c, a)
            for r in range(self.rows)
            for c in range(self.cols)
            for a in range(self.alts)
            if (r, c, a) not in blocked
        ]

    def neighbors(self, pos: Pos) -> List[Pos]:
        blocked = self.obstacles | self._nofly
        if len(pos) == 2:
            r, c = pos
            candidates = [(r, c), (r-1, c), (r+1, c), (r, c-1), (r, c+1)]
            return [
                (nr, nc) for nr, nc in candidates
                if 0 <= nr < self.rows and 0 <= nc < self.cols
                and (nr, nc) not in blocked
            ]
        r, c, a = pos
        candidates = [
            (r, c, a), (r-1, c, a), (r+1, c, a),
            (r, c-1, a), (r, c+1, a),
            (r, c, a-1), (r, c, a+1),
        ]
        return [
            (nr, nc, na) for nr, nc, na in candidates
            if 0 <= nr < self.rows and 0 <= nc < self.cols and 0 <= na < self.alts
            and (nr, nc, na) not in blocked
        ]

    def add_building(self, row: int, col: int, height: int) -> None:
        for a in range(height):
            self.obstacles.add((row, col, a))

    def add_nofly_box(self, min_pos: Pos, max_pos: Pos) -> None:
        if len(min_pos) == 2:
            for r in range(min_pos[0], max_pos[0] + 1):
                for c in range(min_pos[1], max_pos[1] + 1):
                    self._nofly.add((r, c))
        else:
            for r in range(min_pos[0], max_pos[0] + 1):
                for c in range(min_pos[1], max_pos[1] + 1):
                    for a in range(min_pos[2], max_pos[2] + 1):
                        self._nofly.add((r, c, a))

    def clear_nofly(self) -> None:
        self._nofly.clear()
