# Cape Town imagery on `/counselling/cape-town/`

## Status: temporary placeholders

The three Cape landscape photographs used as full-bleed dividers on
`/counselling/cape-town/` are stock images sourced from Pexels. They are
**placeholders**. Michael intends to replace them with his own Cape Town
photography.

## How to replace one

Each divider reads its image from exactly one import at the top of
`src/pages/counselling/cape-town.astro`. To swap a picture:

1. Drop the new file into `src/assets/`.
2. Repoint the matching import to it.
3. If the new photograph is composed differently, adjust that divider's
   `object-[center_NN%]` class so the subject sits where you want it in the band.

Nothing else needs to change. Every divider uses `object-cover` with an
explicit `object-position`, so a replacement at any aspect ratio will still
frame sensibly, and the images are decorative (`alt=""`, `aria-hidden`), so no
alt text has to be rewritten.

## Provenance

All three are published under the [Pexels
License](https://www.pexels.com/license/): free for commercial use, no
attribution required. Attribution is recorded here and in the page source
anyway, so provenance stays recoverable.

| Asset | Photographer | Source |
| --- | --- | --- |
| `src/assets/cape-town-table-mountain-cloud.jpg` | Ryan Lansdown | https://www.pexels.com/photo/majestic-table-mountain-shrouded-in-mist-33283776/ |
| `src/assets/cape-town-mountain-mist.jpg` | Ryan Lansdown | https://www.pexels.com/photo/moody-foggy-landscape-at-table-mountain-32721030/ |
| `src/assets/cape-town-atlantic-dusk.jpg` | Mimi | https://www.pexels.com/photo/dramatic-coastal-view-of-cape-town-at-sunset-35924017/ |

### Processing applied

The two Table Mountain photographs were supplied in portrait orientation. Since
the page renders them as wide horizontal bands, each was cropped to a 3:2
landscape frame before being committed, so the repository is not carrying
thousands of pixels of sky that never reach the screen. All three were
re-encoded as mozjpeg at quality 84. The originals are otherwise unedited; the
warm grade that makes them read as one set with the portrait and the room
photographs is applied in CSS (`.ctc-graded`), not baked into the files.

Astro's image pipeline handles the responsive derivatives at build time.
