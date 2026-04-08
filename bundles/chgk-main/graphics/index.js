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
			direction: "up",
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
		"score.experts"(newVal, oldVal) {
			this.direction = newVal > oldVal ? "up" : "down";
		},
		"score.sectors"(newVal, oldVal) {
			this.direction = newVal > oldVal ? "up" : "down";
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
		digitEnter(el, done) {
			// Если еще не синхронизировались — просто показываем цифру мгновенно
			if (!this.isSynced) {
				gsap.set(el, { y: 0, opacity: 1 });
				done();
				return;
			}

			const dist = window.innerHeight;
			const startY = this.direction === "up" ? dist : -dist;

			gsap.fromTo(
				el,
				{ y: startY, opacity: 0 },
				{
					y: 0,
					opacity: 1,
					duration: 0.8,
					ease: "power3.out",
					onComplete: done,
				},
			);
		},

		digitLeave(el, done) {
			// Если не синхронизировались — удаляем старую цифру мгновенно без анимации
			if (!this.isSynced) {
				done();
				return;
			}

			const dist = window.innerHeight;
			const endY = this.direction === "up" ? -dist : dist;

			gsap.to(el, {
				y: endY,
				opacity: 0,
				duration: 0.7,
				ease: "power3.out",
				onComplete: done,
			});
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
