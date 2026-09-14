# Listen download: why the first Listen was slow

14 Sep 2026. The piano SoundFont (`salamander-8v.sf2`, 287 MB, one object that never changes) downloads once from `sounds.pianolearn.app` (an R2 bucket behind a custom domain) on the first tap of Listen.

## What was found, in order

1. **The edge cache was off.** Every response said `cf-cache-status: DYNAMIC`; the object had no `Cache-Control` and the zone had no cache rule, so every download went back to the bucket. Fixed 14 Sep in the Cloudflare dashboard by the owner: a Cache Rule on hostname `sounds.pianolearn.app` (eligible for cache, edge TTL 1 year ignoring origin headers, browser TTL 1 year) and Smart Tiered Cache on. Check with a GET, not a HEAD (HEAD reports DYNAMIC even when cached): `curl -s -o /dev/null -D - -r 0-1023 https://sounds.pianolearn.app/salamander-8v.sf2 | grep -i cf-cache-status` should say `HIT`.
2. **That was not the owner's bottleneck.** The bucket is in eastern North America, the owner is in Ohio; the cold path was short. On the same Wi-Fi the Mac pulled 47 MB/s, the phone about 1 MB/s, and Safari on the phone pulled the whole file in about 5 s.
3. **The real cause was the app's download session.** Expo SDK 57's `DownloadTask` defaults to `sessionType: 'background'`, an iOS background URLSession that survives suspension but runs through a power-saving daemon at about 1 MB/s. Fixed 14 Sep with `sessionType: 'foreground'` in `src/sound/soundfont.ts` (`Listen: download the SoundFont on a foreground session`). First Listen went from minutes to about 5 s on Wi-Fi.

## Facts worth keeping

- Apple's `AVAudioUnitSampler` loads SF2 and DLS only. No SF3 (compressed) or SFZ; a compressed bank would mean replacing the sampler with FluidSynth or sfizz. Not worth it for a practice aid.
- Bundling the file in the app would push the app past Apple's 200 MB cellular auto-download threshold for every install. Simply Piano and Piano Marvel ship 300 to 560 MB apps; GarageBand downloads its big sound packs in-app instead.
- On-Demand Resources fit the limits but have no Expo or EAS support (custom native module and config plugin needed) and iOS may purge the pack later.
- Cloudflare: R2 custom domains cache up to 512 MB per object on the Free plan; R2 egress is free; Cache Reserve does not apply to R2 domains; `application/octet-stream` is not compressed and 16-bit PCM would not compress usefully anyway.
- Bandwidth arithmetic for 287 MB: about 46 s at 50 Mbps Wi-Fi, 3 m 50 s at 10 Mbps LTE. On cellular a first Listen is still a minute or more.
- The current file is already a cut: 8 of 16 velocity layers, 7.5 s samples. The owner does not want to reduce quality further. If a smaller file is ever wanted, resampling to 32 kHz (about 27 % smaller, keeping layers and lengths) is the cut phones cannot hear; fewer layers or shorter tails are audible.

## Still open, not urgent

- Resumable download: a partial file is discarded and the download restarts from zero. Expo's task supports resume (`pauseAsync`, `savable`, `fromSavable`).
- Quiet prefetch on Wi-Fi after onboarding (gate on `expo-network` connection type), with the background session for that case only. Mainly for cellular users.

## Sources

- Cloudflare, cache with R2 custom domains: https://developers.cloudflare.com/cache/interaction-cloudflare-products/r2/
- Cloudflare, default cache behaviour and size limits: https://developers.cloudflare.com/cache/about/default-cache-behavior
- Cloudflare, Cache Rules: https://developers.cloudflare.com/cache/how-to/cache-rules/settings/
- Cloudflare, Cache Reserve (excludes R2): https://developers.cloudflare.com/cache/advanced-configuration/cache-reserve/
- Cloudflare, Smart Tiered Cache for R2: https://developers.cloudflare.com/changelog/2024-11-20-smart-tiered-cache-for-r2/
- Cloudflare, R2 pricing: https://developers.cloudflare.com/r2/pricing
- Apple, maximum build sizes: https://developer.apple.com/help/app-store-connect/reference/app-uploads/maximum-build-file-sizes
- Apple, On-Demand Resources limits: https://developer.apple.com/help/app-store-connect/reference/on-demand-resources-size-limits/
- Apple forums, background session and force quit: https://developer.apple.com/forums/thread/121487
- Expo SDK 57 FileSystem (DownloadTask, sessionType, resume): https://docs.expo.dev/versions/v57.0.0/sdk/filesystem/
- Apple, AVAudioUnitSampler loadSoundBankInstrument: https://developer.apple.com/documentation/avfaudio/avaudiounitsampler/loadsoundbankinstrument(at:program:bankmsb:banklsb:)
- FluidSynth, SF3 format: https://www.fluidsynth.org/wiki/SoundFont3Format/
- Salamander Grand Piano: https://github.com/sfzinstruments/SalamanderGrandPiano
- Full page: https://claude.ai/code/artifact/4cea556e-f010-40c2-a11a-c7ac72fe75ae
