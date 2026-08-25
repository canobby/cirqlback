# Cute Fantasy — imported sheets (CIRQL hybrid P0)

Curated slice of the **Kenmi "Cute Fantasy RPG"** pack (bought; full pack at
`~/Desktop/Cute Fantasy Asset Pack/`). Only what the P0 foundation + P1 meadow
slice need lives here, served statically at `/cute-fantasy/…`. All tiles are
**16×16**. Add more sheets here (+ a row below) as later phases need them.

Licence note: pack art may be used in the game but must NOT be fed to an AI
generator or redistributed as source. Recolor/recombine in code only.

## tiles/  (16×16 terrain)
| file | source | grid | use |
|------|--------|------|-----|
| grass_middle.png | Tiles/Grass_Middle.png | 1×1 | base ground fill |
| grass_v1..v3.png | Tiles/Grass/Grass_N_Middle.png | 1×1 | grass fill variants (scatter) |
| water_middle.png | Tiles/Water_Middle.png | 1×1 | open-water fill |
| water_blob.png | Tiles/Water/Water_Tile_1.png | 3×5 | water autotile (grass border baked in) |
| water_anim1/2.png | Tiles/Water/Water_Middle_Anim_N.png | 8×1 | animated open-water frames |
| path_middle.png | Tiles/Path_Middle.png | 1×1 | dirt-path fill |
| cobble_blob.png | Tiles/Cobble_Road/Cobble_Road_1.png | 3×5 | cobble-road autotile (grass border baked) |
| beach_blob.png | Tiles/Beach_Tile.png | 5×3 | sand/beach autotile |
| cliff.png | Tiles/Cliff/Stone_Cliff_1_Tile.png | 14×6 | plateau-rim cliff faces |

**Blob (3×5) layout** — the water/cobble autotile grid, decoded for `autotile.ts`:
```
 col0   col1   col2
[ TL ][  N  ][ TR ]   row0   outer (convex) corners + top edge
[  W ][  C  ][  E ]   row1   side edges + centre fill
[ BL ][  S  ][ BR ]   row2   bottom corners + bottom edge
[iNW ][iNE ][ ·  ]   row3   inner (concave) corners
[iSW ][iSE ][ ·  ]   row4   inner corners (+ spare cells)
```

## actors/  (32×32 frames)
| file | source | grid | use |
|------|--------|------|-----|
| player.png | Player/Player.png | 6×10 @32 | player idle/walk (4-dir) + actions — row map in `sprite.ts` |

## props/
| file | source | frame | use |
|------|--------|-------|-----|
| tree_oak.png | Trees/Big_Oak_Tree.png | 64×80 ×3 | frame0 stump · frame1/2 oak (overhead canopy) |
| tree_oak_med.png | Trees/Medium_Oak_Tree.png | 32×48 ×3 | smaller oaks |

## waterfall/  (P3 light layer)
| file | source | grid | use |
|------|--------|------|-----|
| Waterfall_1..8.png | Waterfall/ | 48×4 @16 | 8-frame animated rim cascade |
