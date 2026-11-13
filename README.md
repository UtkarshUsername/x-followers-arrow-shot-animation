# X Followers Arrow Shot Animation

An 18-second, 1080 × 1080 animation using the supplied screenshot of Utkarsh's X profile. The screenshot preserves the original typography, header, tab layout, and spacing. The follower count stays in its original position. A mirrored PixelFX character fires 48 arrows toward the left, raising the count from 97 to 145. A five-second volley accelerates smoothly, holds a fast pace, then slows near the end. The bow raise and recovery each play once around the volley. After the camera finishes zooming out, the character pauses for one second, then turns and aims diagonally upward. A final arrow changes Follow to Following and reveals the notification button, using the supplied control images. That final impact adds one more follower, ending at 146.

- `output/followers-arrow-shot.mp4`: ready to post, H.264, 30 fps, no audio.
- `output/followers-arrow-shot.html`: self-contained interactive version. Open directly, no server needed. Includes play, pause, replay, and seeking. Respects reduced motion by waiting for Play.
- `index.html`: the same interactive version at the workspace root.

## Rebuild

```sh
npm ci
npm test
npm run build
npm run render
```

Video rendering requires FFmpeg on PATH. The export and visual check use headless Microsoft Edge on Windows, or Playwright Chromium on other platforms (`npx playwright install chromium`). No server is needed. Use `node scripts/render.mjs --stills` for inspection images only; these are saved under the ignored `.local/previews/` folder.

The repository includes the source, required reference images, the PixelFX subset with its license and pinned source revision, and final HTML/MP4 deliverables. `node_modules/` is ignored. Temporary previews, superseded assets, and the original full PixelFX checkout are kept locally under ignored `.local/` and are not needed to build or run the project.

`timeline.js` defines the shot timing. `scene.js` renders the same deterministic frames in the browser and in the video export. `assets/profile.png`, `assets/follow.png`, and `assets/following.png` are the supplied reference images. The follower value starts at 97, reaches the current 145 during the volley, then ends at 146 on the Follow-button hit. Above the follower count, “+48 since yesterday” floats upward and fades like the +1 labels, stretched over the time between the volley and the final aiming motion. It finishes fading out as the character turns toward Follow. The existing Following statistic remains 147.

## License

The project code is licensed under the [MIT License](LICENSE). Reference images and third-party assets retain their respective rights and are not covered by the project's code license.

Arrow Shot poses, character rendering, projectile, and impact effects come from [PixelFX](https://github.com/patch-gg/pixelfx), used under its MIT license. The relevant license and notices are preserved in `vendor/pixelfx`. Both the project license and PixelFX notices are included in the standalone HTML. No Patch Pixel font is used.
