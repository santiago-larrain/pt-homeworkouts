# Brief: generar tiras de animación con Wonder (agentes)

You generate animation "keyframe strips" with the Wonder MCP for a batch of movements from `project/catalog_v2/moves.json`
(array; your batch = the index range given in your task). Read `project/prompts/PROMPTS_v5_wonder_strips.md` first.

Rules: do NOT run git. Do NOT edit any existing file. You only create: `project/references/anim/f-<id>.jpg`,
`project/references/anim/m-<id>.jpg`, and your result file `project/catalog_v2/gen/batch-<N>.json`.
Use your scratch dir `/tmp/claude-0/-home-user/36549b73-3a22-5657-ba96-3ce441154ccf/scratchpad/gen-b<N>/` for test cuts.

Tools: load with ToolSearch `select:mcp__Wonder__generate_image,mcp__Wonder__fetch_image_content,mcp__Wonder__get_design_context`.
First call get_design_context once with pageId `01a1bd1e-e239-719f-a130-b8df68c3ca72` and guidelines "none"; use that pageId
in every generate_image (aspectRatio "16:9", leave quality unset, title like "Reverse Lunge Female Strip").
If the Wonder tools are unavailable, stop and report that. You may send 3-4 generate_image calls in parallel.

For each move:
1. FEMALE: generate_image with prompt = `strip.prompt_f` verbatim and imageUrls =
   ["https://raw.githubusercontent.com/santiago-larrain/pt-homeworkouts/main/project/references/character-sheet.jpg",
    one style anchor: ".../main/project/references/generated/1-1-goblet-squat.jpg" for standing moves or
    ".../main/project/references/generated/A4-glute-bridge.jpg" for floor/mat moves].
2. View it with fetch_image_content (url from the result; curl cannot reach cdn.wonder.so). The tool result names a local
   JPG path under /root/.claude/projects/.../tool-results/ — copy that file to `project/references/anim/f-<id>.jpg`.
3. QA strictly, looking at the image: correct number of figures, all in one row, not touching each other; same character
   (face, ponytail+braid, pink leaf set, barefoot); biomechanically correct exercise per the move's cue/tips/positions; correct
   limb (near/far) and props (same size every frame); even progression first→last; orange/yellow muscles present and plausible;
   no text/arrows. If it fails, regenerate (max 3 attempts per image) with a corrected prompt: add explicit per-frame joint
   angles, or change the camera view if the view is the problem (record the final prompt and view you used).
4. MALE: generate_image with imageUrls = [".../main/project/references/character-sheet-male.jpg", <the accepted female
   cdn.wonder.so URL>] and Plantilla 2 of PROMPTS_v5 filled with a faithful summary of the movement, props, what stays
   still, and the muscles. On mat/floor moves say "white socks (no shoes)"; standing moves keep the black sneakers.
   View, copy to `project/references/anim/m-<id>.jpg`, QA the same way (must match the female frame by frame).
5. Test-cut both: `python3 project/tools/strip_frames.py <jpg> <frames> <scratch>/out <f|m>-<id> --anchor=<strip.anchor>`
   (anchors: feet|center|left|right; optional `--cuts=x1,x2,…` = pixel columns between figures when two figures touch and
   the tool reports a wrong count). View at least the first and last cut frame of each strip (they are .webp; Read can show
   them) to confirm clean cuts: whole figure present, no pieces of a neighbour, floor/mat intact. If a different anchor
   gives steadier alignment (the body part that stays still should stay still), use it and record it.

Result file `batch-<N>.json`: array of {id, status: "ok"|"needs-review"|"failed", frames, anchor, cuts: {f?: "…", m?: "…"},
loop, pos, view (final), female_url, male_url, attempts: {f, m}, notes (what is imperfect, honestly)}. Write it
incrementally (after every move) so partial work survives. Be honest: mark "needs-review" when something is off but usable,
"failed" when you could not get a correct image. Final report: counts by status and the list of ids needing review with why.
