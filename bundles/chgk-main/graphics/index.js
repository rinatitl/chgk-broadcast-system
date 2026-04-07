const { createApp } = Vue;

const scoreRep = nodecg.Replicant("score");
const gameStateRep = nodecg.Replicant("gameState");
const displayStateRep = nodecg.Replicant("displayState");
const assetsGamesRep = nodecg.Replicant("assets:games");
const assetsMainRep = nodecg.Replicant("assets:main");

createApp({
	data() {
		return {
			score: { experts: 0, sectors: 0 },
			gameState: { currentTheme: "youth", currentGame: "g1" },
			displayState: {
				scoreboardExpanded: true,
				isIntroPlaying: false,
				activeMedia: {
					id: null,
					fileUrl: null,
					type: null,
				},
			},
			assetsGames: [],
			assetsMain: [],
			isSynced: false,
		};
	},
	watch: {
		"displayState.scoreboardExpanded": {
			handler(isExpanded) {
				this.$nextTick(() => {
					const left = document.querySelector(".half.left");
					const right = document.querySelector(".half.right");
					if (!left || !right) return;

					if (!this.isSynced) {
						gsap.set(right, { xPercent: isExpanded ? 100 : 0 });
						gsap.set(left, { xPercent: isExpanded ? -100 : 0 });
						return;
					}
					if (isExpanded) {
						gsap.to(left, { xPercent: -100, duration: 0.8, ease: "power2.in" });
						gsap.to(right, { xPercent: 100, duration: 0.8, ease: "power2.in" });
					} else {
						gsap.to([left, right], { xPercent: 0, duration: 0.8, ease: "power2.out" });
					}
				});
			},
			immediate: true,
		},
		"displayState.isIntroPlaying"(isPlaying) {
			if (isPlaying) {
				this.$nextTick(() => {
					const v = this.$refs.introVideo;
					if (v) {
						v.currentTime = 0;
						v.play();
					}
				});
			}
		},
	},
	methods: {
		onMediaLeave(el, done) {
			const isSwitching = this.displayState.activeMedia.id !== null;

			if (isSwitching) {
				gsap.to(el, {
					opacity: 0,
					duration: 0.5,
					delay: 0,
					ease: "power2.in",
					onComplete: done,
				});
			} else {
				gsap.to(el, {
					opacity: 0,
					duration: 0.3,
					delay: 0.8,
					ease: "power2.in",
					onComplete: done,
				});
			}
		},
		onMediaEnter(el, done) {
			gsap.fromTo(
				el,
				{
					opacity: 0,
				},
				{
					opacity: 1,
					duration: 0.2,
					onComplete: done,
				},
			);
		},
		onIntroEnded() {
			displayStateRep.value.isIntroPlaying = false;
		},
	},
	computed: {
		currentCoverUrl() {
			const name = `${this.gameState.currentTheme}_cover`;
			const asset = this.assetsMain.find((a) => a.name.includes(name));
			return asset ? asset.url : "";
		},
		currentIntroUrl() {
			const name = `${this.gameState.currentTheme}_intro`;
			const asset = this.assetsMain.find((a) => a.name.includes(name));
			return asset ? asset.url : "";
		},
	},
	mounted() {
		const clean = (val) => (val ? JSON.parse(JSON.stringify(val)) : val);

		NodeCG.waitForReplicants(scoreRep, gameStateRep, displayStateRep, assetsGamesRep, assetsMainRep).then(() => {
			scoreRep.on("change", (newVal) => {
				if (newVal) this.score = clean(newVal);
			});
			gameStateRep.on("change", (newVal) => {
				if (newVal) this.gameState = clean(newVal);
			});
			displayStateRep.on("change", (newVal) => {
				if (newVal) this.displayState = clean(newVal);
				setTimeout(() => {
					this.isSynced = true;
				}, 100);
			});
			assetsGamesRep.on("change", (newVal) => {
				if (newVal) this.assetsGames = clean(newVal) || [];
			});
			assetsMainRep.on("change", (newVal) => {
				if (newVal) this.assetsMain = clean(newVal) || [];
			});
		});
	},
}).mount("#app");
