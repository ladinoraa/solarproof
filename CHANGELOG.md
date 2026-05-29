## [1.7.1](https://github.com/AnnabelJoe/solarproof/compare/v1.7.0...v1.7.1) (2026-05-29)

### Bug Fixes

* implement CSRF protection for state-changing API endpoints ([#335](https://github.com/AnnabelJoe/solarproof/issues/335)) ([2c6c8c8](https://github.com/AnnabelJoe/solarproof/commit/2c6c8c876dd56d55175a52eb35e7c55c9821efb8))

## [1.7.0](https://github.com/AnnabelJoe/solarproof/compare/v1.6.0...v1.7.0) (2026-05-28)

### Features

* **#145:** add Stellar explorer deep links for all on-chain transactions ([ccb13da](https://github.com/AnnabelJoe/solarproof/commit/ccb13da0009895ef035d757374743c9c48e01253)), closes [#145](https://github.com/AnnabelJoe/solarproof/issues/145)

### Documentation

* add JSDoc to all public API functions ([#316](https://github.com/AnnabelJoe/solarproof/issues/316)) ([eca0923](https://github.com/AnnabelJoe/solarproof/commit/eca092377c187939d87c11badd06ea8ad06e433f))
* complete OpenAPI 3.0 spec for all API endpoints ([#307](https://github.com/AnnabelJoe/solarproof/issues/307)) ([e15d906](https://github.com/AnnabelJoe/solarproof/commit/e15d9065f074f1cc04ebd546fbbc3400b24ab29d))
* document public verifier API for third-party integrations ([#313](https://github.com/AnnabelJoe/solarproof/issues/313)) ([9eb74ff](https://github.com/AnnabelJoe/solarproof/commit/9eb74ff518784611745ea27a1bc6c016b5086a06))

## [1.6.0](https://github.com/AnnabelJoe/solarproof/compare/v1.5.0...v1.6.0) (2026-05-28)

### Features

* implement SEP-41 approve/allowance/transfer_from ([#286](https://github.com/AnnabelJoe/solarproof/issues/286)) ([e3c6fce](https://github.com/AnnabelJoe/solarproof/commit/e3c6fcec3bb7bc1b11178bae340749d944836123))

### Documentation

* document Ed25519 meter signing protocol and key lifecycle ([#309](https://github.com/AnnabelJoe/solarproof/issues/309)) ([cbfd1be](https://github.com/AnnabelJoe/solarproof/commit/cbfd1be6e720bc1c19c08d0597259576e8bf6b77))

## [1.5.0](https://github.com/AnnabelJoe/solarproof/compare/v1.4.0...v1.5.0) (2026-05-28)

### Features

* **api:** add Idempotency-Key header support to readings API ([e4bccbe](https://github.com/AnnabelJoe/solarproof/commit/e4bccbe3fe16471654445d4dd1a9a5f8fb323030)), closes [#267](https://github.com/AnnabelJoe/solarproof/issues/267)

## [1.4.0](https://github.com/AnnabelJoe/solarproof/compare/v1.3.0...v1.4.0) (2026-05-28)

### Features

* **observability:** add OpenTelemetry APM instrumentation ([670c77a](https://github.com/AnnabelJoe/solarproof/commit/670c77a9dc90d7fe7475cde001c451725797243a)), closes [#291](https://github.com/AnnabelJoe/solarproof/issues/291)

### Documentation

* enhance developer onboarding guide ([ff7de25](https://github.com/AnnabelJoe/solarproof/commit/ff7de25516744e97733fc8fd724fc066a6bcacd9)), closes [#308](https://github.com/AnnabelJoe/solarproof/issues/308)

## [1.3.0](https://github.com/AnnabelJoe/solarproof/compare/v1.2.0...v1.3.0) (2026-05-28)

### Features

* add /api/health and /api/ready endpoints ([#275](https://github.com/AnnabelJoe/solarproof/issues/275)) ([4f761a4](https://github.com/AnnabelJoe/solarproof/commit/4f761a428a2c3a9cb239d8ee1c2f7150d73acfe1))

### Documentation

* document pnpm --frozen-lockfile requirement ([#302](https://github.com/AnnabelJoe/solarproof/issues/302)) ([4072e11](https://github.com/AnnabelJoe/solarproof/commit/4072e11a05c90cf952132bfd1b7b96d514021f1b))

## [1.2.0](https://github.com/AnnabelJoe/solarproof/compare/v1.1.0...v1.2.0) (2026-05-28)

### Features

* add governance voting UI ([#265](https://github.com/AnnabelJoe/solarproof/issues/265)) ([b59d23a](https://github.com/AnnabelJoe/solarproof/commit/b59d23a57fe4ba0c2e671f9ba4022ab2ea027ebb))

## [1.1.0](https://github.com/AnnabelJoe/solarproof/compare/v1.0.0...v1.1.0) (2026-05-28)

### Features

* responsive dashboard, certificate detail page, toast notifications, and accessibility improvements ([704c0a5](https://github.com/AnnabelJoe/solarproof/commit/704c0a5dc414eaeb4d15da15d4579a10f1bc076a))

## 1.0.0 (2026-05-19)

### Features

* **#12:** add toast notification system for transaction feedback ([c3ae97c](https://github.com/AnnabelJoe/solarproof/commit/c3ae97c0a0ff2bf5adf9115aa15e890686d85002)), closes [#12](https://github.com/AnnabelJoe/solarproof/issues/12)
* **#13:** implement certificate retirement flow in the UI ([093620a](https://github.com/AnnabelJoe/solarproof/commit/093620afbd16c89f5f0b3f3b4b092a6c6858d4f1)), closes [#13](https://github.com/AnnabelJoe/solarproof/issues/13)
* **#14:** add chart visualizations for energy generation over time ([5a35ae7](https://github.com/AnnabelJoe/solarproof/commit/5a35ae7263925dc9af3e7f1fc4467485838136ca)), closes [#14](https://github.com/AnnabelJoe/solarproof/issues/14)
* add /certificate/[id] chain-of-custody detail page ([cb622a8](https://github.com/AnnabelJoe/solarproof/commit/cb622a8eb3b7977627674f1772a1eedc6f3ca981))
* add audit registry deduplication + local Soroban integration scripts ([3db8f31](https://github.com/AnnabelJoe/solarproof/commit/3db8f31344c4929d1b7c30b2b5d7d047e75ef521))
* add automated CodeQL security scanning ([#88](https://github.com/AnnabelJoe/solarproof/issues/88)) ([8021a4f](https://github.com/AnnabelJoe/solarproof/commit/8021a4f4da2650681931c97af63a07069b7dedd6))
* add copy-to-clipboard functionality for IDs and hashes ([c35dd6a](https://github.com/AnnabelJoe/solarproof/commit/c35dd6aec0ebf160773d37fca1d0b9fe6e089a7f)), closes [#23](https://github.com/AnnabelJoe/solarproof/issues/23)
* add Docker Compose setup for local development ([#82](https://github.com/AnnabelJoe/solarproof/issues/82)) ([6c6fb8b](https://github.com/AnnabelJoe/solarproof/commit/6c6fb8be3ec44d352dc8535251c00adb0d5379d8))
* add npm and cargo audit to CI pipeline ([#91](https://github.com/AnnabelJoe/solarproof/issues/91)) ([24549f0](https://github.com/AnnabelJoe/solarproof/commit/24549f054f0dc39da01ac3f36ca4d6bf2d6da508))
* add OpenAPI spec, /api/docs endpoint, Swagger UI, and CI validation ([#107](https://github.com/AnnabelJoe/solarproof/issues/107)) ([ed079cf](https://github.com/AnnabelJoe/solarproof/commit/ed079cf9d41213e5165e344235af97c9fa30f322))
* add POST /api/readings/batch endpoint ([514e01f](https://github.com/AnnabelJoe/solarproof/commit/514e01f2765186c0ee1ce90da6f2590f5cfaa29b))
* add real-time dashboard updates with WebSocket support ([091499c](https://github.com/AnnabelJoe/solarproof/commit/091499c5f355201c159d4afa13bb45d1f5c6bb77)), closes [#9](https://github.com/AnnabelJoe/solarproof/issues/9)
* add Redis/Upstash caching for certificate queries ([#43](https://github.com/AnnabelJoe/solarproof/issues/43)) ([a7f7583](https://github.com/AnnabelJoe/solarproof/commit/a7f7583f4036a1e32010ebfab1a94173b2769898))
* add Vercel Analytics and Speed Insights ([#94](https://github.com/AnnabelJoe/solarproof/issues/94)) ([e79473c](https://github.com/AnnabelJoe/solarproof/commit/e79473cfa2752867a1a4bd5efde09f66d4e878b3))
* **api:** append-only audit_log for operator actions ([767e161](https://github.com/AnnabelJoe/solarproof/commit/767e16117bef0576b71fc6ec5004789a39769471)), closes [#44](https://github.com/AnnabelJoe/solarproof/issues/44)
* **api:** implement CORS policy for API routes ([235e9b8](https://github.com/AnnabelJoe/solarproof/commit/235e9b8046fc1af0d131c146a72bcfc977c52aee)), closes [#46](https://github.com/AnnabelJoe/solarproof/issues/46)
* **api:** implement Ed25519 signature verification in POST /api/readings ([#26](https://github.com/AnnabelJoe/solarproof/issues/26)) ([6f92870](https://github.com/AnnabelJoe/solarproof/commit/6f928706880f1e686251c4ccde2656180963f976))
* **api:** implement idempotency for meter reading submissions ([#28](https://github.com/AnnabelJoe/solarproof/issues/28)) ([8c8ebc2](https://github.com/AnnabelJoe/solarproof/commit/8c8ebc20392fe015f2aea6903523a1a96ea1d3fb))
* **api:** implement webhook notifications for certificate events ([#38](https://github.com/AnnabelJoe/solarproof/issues/38)) ([b2a5323](https://github.com/AnnabelJoe/solarproof/commit/b2a5323ee4f15b2e36263fbad7c2c128ccbad911))
* **api:** retry with exponential backoff for anchor/mint transactions ([89294a1](https://github.com/AnnabelJoe/solarproof/commit/89294a132c7b5551fca7aff3f0d50d52cf44d763)), closes [#31](https://github.com/AnnabelJoe/solarproof/issues/31)
* **auth:** implement JWT + Supabase Auth for operator routes ([#40](https://github.com/AnnabelJoe/solarproof/issues/40)) ([94311fc](https://github.com/AnnabelJoe/solarproof/commit/94311fc9129580848ea0c1a3cd30b057b1dea687))
* **backup:** daily pg_dump to S3 with 30-day retention and Slack alerts ([#90](https://github.com/AnnabelJoe/solarproof/issues/90)) ([bb7d2de](https://github.com/AnnabelJoe/solarproof/commit/bb7d2deeb7b3606ec8f80288526db678673e3e49))
* bitmap vote storage for community_governance ([#71](https://github.com/AnnabelJoe/solarproof/issues/71)) ([6b9378d](https://github.com/AnnabelJoe/solarproof/commit/6b9378d6ff6ef975fd72e9a0f9abc3a1fd6f7433))
* configurable quorum_bps and threshold_bps in community_governance ([#64](https://github.com/AnnabelJoe/solarproof/issues/64)) ([9cb685b](https://github.com/AnnabelJoe/solarproof/commit/9cb685b1bf742412e25e9d267b35ec5fceab2fda))
* configure Vercel preview deployments for every PR ([#78](https://github.com/AnnabelJoe/solarproof/issues/78)) ([ad997f7](https://github.com/AnnabelJoe/solarproof/commit/ad997f7d27153d247e503636c37784ce8aa408ec))
* **contracts:** add multisig_admin contract for 2-of-3 admin ops ([#69](https://github.com/AnnabelJoe/solarproof/issues/69)) ([740383b](https://github.com/AnnabelJoe/solarproof/commit/740383b4d550e3fda0ad82a550eb8df780c4f297))
* **contracts:** add version tracking and migration support ([#70](https://github.com/AnnabelJoe/solarproof/issues/70)) ([b057beb](https://github.com/AnnabelJoe/solarproof/commit/b057beb8a0f86801d15285bc6b8b280aa7b0f68d))
* **contracts:** cargo-fuzz targets for mint, anchor, vote ([30ffc81](https://github.com/AnnabelJoe/solarproof/commit/30ffc814d321a78282e2f9991e323b0d46d68cd0)), closes [#67](https://github.com/AnnabelJoe/solarproof/issues/67)
* **contracts:** emit events for mint/retire/anchor/propose/vote ([b4cc652](https://github.com/AnnabelJoe/solarproof/commit/b4cc652a828639cd1a29e26e1d98c375912ae832)), closes [#60](https://github.com/AnnabelJoe/solarproof/issues/60)
* cursor-based paginated certificate list at /certificates ([1d55113](https://github.com/AnnabelJoe/solarproof/commit/1d55113b5cd575a6a4708ba810b71c04a92b3f6f))
* **energy_token:** implement retire() for REC compliance ([#54](https://github.com/AnnabelJoe/solarproof/issues/54)) ([842042a](https://github.com/AnnabelJoe/solarproof/commit/842042ac24abb3079172a119e59ecefcb98ef8ce))
* env var validation at startup with @t3-oss/env-nextjs ([#79](https://github.com/AnnabelJoe/solarproof/issues/79)) ([f386b18](https://github.com/AnnabelJoe/solarproof/commit/f386b18c3fdebf5d6ab3b853c97d31c6dd2df310))
* **governance:** add contract upgrade mechanism with 48h timelock ([f335d8c](https://github.com/AnnabelJoe/solarproof/commit/f335d8c8627abf522f3e121f6705b18905a1eb5b)), closes [#55](https://github.com/AnnabelJoe/solarproof/issues/55)
* **governance:** add proposal execution timelock ([#65](https://github.com/AnnabelJoe/solarproof/issues/65)) ([e2ed39e](https://github.com/AnnabelJoe/solarproof/commit/e2ed39eb8c4ac5e636157646718ec4f3c40b4907))
* **health:** comprehensive health check endpoint with DB + Stellar RPC checks ([#45](https://github.com/AnnabelJoe/solarproof/issues/45)) ([c0ebc47](https://github.com/AnnabelJoe/solarproof/commit/c0ebc471243bd4b80aa56a0148c80016496a527a))
* implement POST /api/certificates/[id]/retire ([#34](https://github.com/AnnabelJoe/solarproof/issues/34)) ([1d7e055](https://github.com/AnnabelJoe/solarproof/commit/1d7e055641e9dfa96ba0e7ba55fbd976074273d1))
* implement SEP-41 token interface compliance for energy_token ([#61](https://github.com/AnnabelJoe/solarproof/issues/61)) ([d9788f9](https://github.com/AnnabelJoe/solarproof/commit/d9788f9690294cac690219b1d6555c9d63cce6a1))
* implement Supabase RLS for multi-operator isolation ([#36](https://github.com/AnnabelJoe/solarproof/issues/36)) ([5e7bdf2](https://github.com/AnnabelJoe/solarproof/commit/5e7bdf2d6f677501f07f43f6384531fa04af4419))
* implement token transfer pause mechanism ([#66](https://github.com/AnnabelJoe/solarproof/issues/66)) ([e7fc62a](https://github.com/AnnabelJoe/solarproof/commit/e7fc62a36670474926325bcd7c8ab7e8ab64ab58))
* **infra:** set up staging environment on Vercel ([#89](https://github.com/AnnabelJoe/solarproof/issues/89)) ([7ad4dae](https://github.com/AnnabelJoe/solarproof/commit/7ad4daeecc306b586397c6b50784d316e0cff15a))
* initial SolarProof — cryptographic renewable energy certification ([404fce6](https://github.com/AnnabelJoe/solarproof/commit/404fce6acdbc814b42293fd2328152291caf3833))
* integrate Sentry error monitoring in Next.js app ([#83](https://github.com/AnnabelJoe/solarproof/issues/83)) ([da4fe77](https://github.com/AnnabelJoe/solarproof/commit/da4fe77ff4bbaa0eff8ac552817cc3c04e942b17))
* load Stellar signing key from AWS Secrets Manager with rotation support ([7b81c1a](https://github.com/AnnabelJoe/solarproof/commit/7b81c1a2e8a1d669a2b0cad467dc8b296af9be59)), closes [#50](https://github.com/AnnabelJoe/solarproof/issues/50)
* **meters:** add meter management UI and API routes ([e379c87](https://github.com/AnnabelJoe/solarproof/commit/e379c87458715989fac4006598d3986d565560d0)), closes [#18](https://github.com/AnnabelJoe/solarproof/issues/18)
* **migrations:** add rollback scripts and operator_sessions migration ([#37](https://github.com/AnnabelJoe/solarproof/issues/37)) ([d0e432c](https://github.com/AnnabelJoe/solarproof/commit/d0e432cb132c442839ab4674df3454d57c6bb585))
* mobile responsive, skeleton loaders, dark mode, ARIA a11y ([ae45c53](https://github.com/AnnabelJoe/solarproof/commit/ae45c535882691c29b5686483599448d19d42ad1))
* **monitoring:** add uptime checks for /api/health and /verify ([#84](https://github.com/AnnabelJoe/solarproof/issues/84)) ([cd5d44e](https://github.com/AnnabelJoe/solarproof/commit/cd5d44e0161b6b23def3770d2761aa140d2acdd7))
* optimize audit_registry storage — hash-only on-chain ([#59](https://github.com/AnnabelJoe/solarproof/issues/59)) ([6f233cd](https://github.com/AnnabelJoe/solarproof/commit/6f233cda8b2e0aebbf56bb046c2cbf74a3058dff))
* overflow protection for energy_token mint arithmetic ([#51](https://github.com/AnnabelJoe/solarproof/issues/51)) ([9857d35](https://github.com/AnnabelJoe/solarproof/commit/9857d356cbdb2142e22005a8eede107fe89f6edb))
* pin Rust toolchain and harden CI for Soroban contracts ([#77](https://github.com/AnnabelJoe/solarproof/issues/77)) ([d61094a](https://github.com/AnnabelJoe/solarproof/commit/d61094a4469aa22adf81fe4180d8186466e2f9b9))
* pre-flight account and trustline checks before mint ([7de0635](https://github.com/AnnabelJoe/solarproof/commit/7de06358546a1fcfece5385c9a9397c4ec8b7c80))
* **queue:** async Stellar transaction queue with job status API ([0fc6c1d](https://github.com/AnnabelJoe/solarproof/commit/0fc6c1d525483ae422585c51f5c5069d796c37ab)), closes [#42](https://github.com/AnnabelJoe/solarproof/issues/42)
* rate limiting, meter name, tracer-sim, verify chain-of-custody ([5b2f413](https://github.com/AnnabelJoe/solarproof/commit/5b2f413aba7ac18fc7bacca90cab0f89ec2da64e)), closes [#27](https://github.com/AnnabelJoe/solarproof/issues/27) [#30](https://github.com/AnnabelJoe/solarproof/issues/30) [#32](https://github.com/AnnabelJoe/solarproof/issues/32) [#35](https://github.com/AnnabelJoe/solarproof/issues/35)
* resolve issues [#10](https://github.com/AnnabelJoe/solarproof/issues/10) [#15](https://github.com/AnnabelJoe/solarproof/issues/15) [#16](https://github.com/AnnabelJoe/solarproof/issues/16) [#17](https://github.com/AnnabelJoe/solarproof/issues/17) — i18n, governance form, voting UI, verify stepper ([b7ecc3b](https://github.com/AnnabelJoe/solarproof/commit/b7ecc3b023a61aa935f46aae1e071e952050b9ea))
* **scripts:** add idempotent deploy-testnet and deploy-mainnet scripts ([e7c4855](https://github.com/AnnabelJoe/solarproof/commit/e7c4855a584b8e5c9e878847436a9736d7799770)), closes [#63](https://github.com/AnnabelJoe/solarproof/issues/63)
* **stellar:** add 10s timeout and circuit breaker to all RPC calls ([866fffe](https://github.com/AnnabelJoe/solarproof/commit/866fffe5e0caddebcbc6ed3ed355deaaff198421)), closes [#41](https://github.com/AnnabelJoe/solarproof/issues/41)
* structured log aggregation via Logtail (Better Stack) ([23bc6ac](https://github.com/AnnabelJoe/solarproof/commit/23bc6acd212628b8db4385eeae8c35259e057f70)), closes [#92](https://github.com/AnnabelJoe/solarproof/issues/92)
* structured logging, API versioning, pagination, governance tests ([7b74132](https://github.com/AnnabelJoe/solarproof/commit/7b741323a974253f90206aef4b5115bd74638504)), closes [#33](https://github.com/AnnabelJoe/solarproof/issues/33) [#39](https://github.com/AnnabelJoe/solarproof/issues/39) [#47](https://github.com/AnnabelJoe/solarproof/issues/47) [#58](https://github.com/AnnabelJoe/solarproof/issues/58)
* Supabase IaC migrations and CI validation ([#95](https://github.com/AnnabelJoe/solarproof/issues/95)) ([302f23e](https://github.com/AnnabelJoe/solarproof/commit/302f23ee8dec27c6a5ffdea0bbfd7dff369d981a))
* **web:** add custom 404 and 500 error pages ([d8d9895](https://github.com/AnnabelJoe/solarproof/commit/d8d98958bdbdae336dd5127183ae6ac311ce34b2)), closes [#22](https://github.com/AnnabelJoe/solarproof/issues/22)
* **web:** make contract addresses and network config env-configurable ([#62](https://github.com/AnnabelJoe/solarproof/issues/62)) ([b393066](https://github.com/AnnabelJoe/solarproof/commit/b393066d14b9ede145da192deac3e80a7577b92a))

### Bug Fixes

* **#11:** persist Freighter wallet connection state across page refreshes ([32045d4](https://github.com/AnnabelJoe/solarproof/commit/32045d487cae237ca191e49542196a35b80776c7)), closes [#11](https://github.com/AnnabelJoe/solarproof/issues/11)
* **a11y:** improve keyboard accessibility on verify page ([1751ba4](https://github.com/AnnabelJoe/solarproof/commit/1751ba41c1f0d88d9bc0cc84b653991ca304256f))
* add error boundaries to isolate component failures ([39f715b](https://github.com/AnnabelJoe/solarproof/commit/39f715b23df292e1f23238bbf37d93e85a2c7484))
* add input validation to verify and retire API routes ([#29](https://github.com/AnnabelJoe/solarproof/issues/29)) ([4ea58a6](https://github.com/AnnabelJoe/solarproof/commit/4ea58a623b5efbbbba1bff7d023ed65893d40543))
* add spinner and disable buttons during form submission ([7ef2928](https://github.com/AnnabelJoe/solarproof/commit/7ef292884c30c921125e35f8d5f5a6ed64608c1a)), closes [#21](https://github.com/AnnabelJoe/solarproof/issues/21)
* **audit-registry:** add access control to anchor() ([a042f18](https://github.com/AnnabelJoe/solarproof/commit/a042f187585493850aee021b4c4c329c9451b532)), closes [#52](https://github.com/AnnabelJoe/solarproof/issues/52)
* cargo fmt, Rust 1.88.0 toolchain, remove pnpm version conflict ([ea5a393](https://github.com/AnnabelJoe/solarproof/commit/ea5a3939b2bb065a42f88c130c4be4261412f545))
* **ci:** commit pnpm lockfile for frozen-lockfile enforcement ([#86](https://github.com/AnnabelJoe/solarproof/issues/86)) ([0752cbd](https://github.com/AnnabelJoe/solarproof/commit/0752cbd2c335ffe4ff2dc3160c35565651da2dfa))
* **governance:** add reentrancy guard to vote() ([0e051d2](https://github.com/AnnabelJoe/solarproof/commit/0e051d28111f263df7595da3bb9c15d592fb42a4)), closes [#53](https://github.com/AnnabelJoe/solarproof/issues/53)
* regenerate lockfile, bump rust-toolchain.toml to 1.88.0 ([158d740](https://github.com/AnnabelJoe/solarproof/commit/158d740e4f676589fd5e5e10d7b180ef56c3842a))
* remove empty with: blocks from pnpm/action-setup steps ([b8ebced](https://github.com/AnnabelJoe/solarproof/commit/b8ebced91c374231093bde16ca98f20c65030669))
* resolve all build, type, and lint errors ([8a67ea0](https://github.com/AnnabelJoe/solarproof/commit/8a67ea0c1af167b756621ca9e683f5b763042973))
* resolve issues [#19](https://github.com/AnnabelJoe/solarproof/issues/19), [#20](https://github.com/AnnabelJoe/solarproof/issues/20), [#24](https://github.com/AnnabelJoe/solarproof/issues/24), [#25](https://github.com/AnnabelJoe/solarproof/issues/25) ([78448aa](https://github.com/AnnabelJoe/solarproof/commit/78448aa04a1460fe8756316666862022d11ed900))
* secrets management - placeholder .env.example + secret scanning ([#85](https://github.com/AnnabelJoe/solarproof/issues/85)) ([17435bd](https://github.com/AnnabelJoe/solarproof/commit/17435bd161268aa661935ec2eb5f2cf576f9b0d4))

### Documentation

* add API reference for all endpoints ([#96](https://github.com/AnnabelJoe/solarproof/issues/96)) ([d66dbe4](https://github.com/AnnabelJoe/solarproof/commit/d66dbe44ef4cb0e58a117be8836b67c625d68717))
* add contract deployment guide and deployments.md ([#108](https://github.com/AnnabelJoe/solarproof/issues/108)) ([e084e5e](https://github.com/AnnabelJoe/solarproof/commit/e084e5e9d88c951aa981fa097b58ea55dc851af5))
* add descriptions and examples to .env.example ([#105](https://github.com/AnnabelJoe/solarproof/issues/105)) ([e834f15](https://github.com/AnnabelJoe/solarproof/commit/e834f15888be68aff8ed82a2b87c824f03d0e29a))
* add developer onboarding guide ([#97](https://github.com/AnnabelJoe/solarproof/issues/97)) ([3b77c50](https://github.com/AnnabelJoe/solarproof/commit/3b77c50d1e260cd09a589e7176c826c9ed1acb22))
* add end-user guide for public verifier ([#106](https://github.com/AnnabelJoe/solarproof/issues/106)) ([a151440](https://github.com/AnnabelJoe/solarproof/commit/a151440df3a6c5e490b8aefb56d34de3f227a2e2))
* **adr:** add ADR template, index, and 4 ADRs ([#99](https://github.com/AnnabelJoe/solarproof/issues/99)) ([28db52c](https://github.com/AnnabelJoe/solarproof/commit/28db52cfe55c76627cf8893adcffed5b89dc6905))
* **contracts:** add interface and error code docs for all three contracts ([b6d39fd](https://github.com/AnnabelJoe/solarproof/commit/b6d39fdb384eb72ed8c619fb6b5b29ddb8ce32e6)), closes [#98](https://github.com/AnnabelJoe/solarproof/issues/98)
* **contracts:** add NatSpec-style doc comments to all public functions ([#68](https://github.com/AnnabelJoe/solarproof/issues/68)) ([ed9a056](https://github.com/AnnabelJoe/solarproof/commit/ed9a05610dcf8e14f172fbbc0cc717b74b8c6c7e))
* expand CONTRIBUTING.md with branch naming, commit format, PR checklist, and review expectations ([b26a136](https://github.com/AnnabelJoe/solarproof/commit/b26a136d1b76536be00a630c3e4d5e4786126065)), closes [#100](https://github.com/AnnabelJoe/solarproof/issues/100)
* prepare contracts for security audit ([#75](https://github.com/AnnabelJoe/solarproof/issues/75)) ([295766b](https://github.com/AnnabelJoe/solarproof/commit/295766b5e8196f281cddcb483d6acb45bcbf736f))

# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

> **Maintenance note:** This file is updated automatically by
> [semantic-release](https://github.com/semantic-release/semantic-release) on every
> release from `main`. To add an entry manually, follow the format below and open a PR.

---

## [Unreleased]

### Added
- STRIDE-based threat model (`docs/THREAT_MODEL.md`) covering 13 attack vectors across all 6 STRIDE categories (#110)
- TSDoc comments and inline explanations on all exported functions in `packages/stellar/src/index.ts`, `apps/web/src/lib/stellar.ts`, and `apps/web/src/lib/crypto.ts` (#103)
- Vitest unit tests for `buildTransaction`, `anchorReading` (build_anchor_tx), `mintCertificates` (build_mint_tx), and `retireCertificate` (build_retire_tx) with mocked Stellar RPC (#118)

---

## [1.0.0] — 2026-04-21

### Added
- End-to-end cryptographic proof pipeline: Ed25519 meter signing → on-chain anchor → certificate minting → retirement
- Three Soroban smart contracts: `energy_token` (SEP-41), `audit_registry`, `community_governance`
- `packages/stellar` shared utilities: `buildTransaction`, `kwhToStroops`, `stroopsToKwh`, `addressToScVal`, `amountToScVal`, `bytesToScVal`
- Next.js 15 web app with dashboard, public verifier (`/verify`), and API routes
- `POST /api/readings` endpoint: verifies Ed25519 signature, anchors hash, mints certificates
- tracer-sim integration for automatic diagnosis of failed Soroban transactions
- Supabase backend for off-chain reading storage and meter registry
- Docker Compose stack (Next.js + Supabase + Redis) for local development
- Meter simulation scripts (`scripts/gen-meter-key.mjs`, `scripts/send-reading.mjs`)
- CI workflow with GitHub Actions (lint, type-check, build, contract tests)
- Gitleaks secret-scanning workflow
- semantic-release configuration for automated versioning and changelog generation
- Architecture Decision Records (`docs/adr/`)
- API reference (`docs/API.md`), deployment guide (`docs/DEPLOYMENT.md`), onboarding guide (`docs/ONBOARDING.md`)

[Unreleased]: https://github.com/AnnabelJoe/solarproof/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/AnnabelJoe/solarproof/releases/tag/v1.0.0
