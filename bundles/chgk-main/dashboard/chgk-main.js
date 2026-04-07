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
				activeMedia: { id: null, fileUrl: null, type: null },
			},
			assetsGames: [],
			assetsMain: [],
			themes: [
				{ id: "youth", label: "МЛ" },
				{ id: "amateur", label: "ЛЛ" },
				// { id: "corporate", label: "КЛ" },
				// { id: "monochrome", label: "ЧБ" },
				{ id: "plekhanov", label: "ПКЗ" },
			],
			selectedFile: null,
			uploadName: "",
			uploadStatus: "",
			manualGameNumber: null,
			activeUpload: { sector: null, type: null, subIndex: null },
		};
	},
	computed: {
		availableGames() {
			if (!this.assetsGames || !this.assetsGames.length) return ["g1"];
			const games = this.assetsGames
				.map((file) => file.name.split("_")[0])
				.filter((prefix) => prefix.startsWith("g"));
			const uniqueGames = [...new Set(games)].sort((a, b) => {
				return a.localeCompare(b, undefined, { numeric: true });
			});
			return uniqueGames.length ? uniqueGames : ["g1"];
		},
		detectedGameNumber() {
			if (!this.assetsGames || this.assetsGames.length === 0) return 1;

			const gameNumbers = this.assetsGames.map((f) => {
				const match = f.name.match(/^g(\d+)_/);
				return match ? parseInt(match[1]) : 0;
			});

			const maxGame = Math.max(...gameNumbers, 0);
			return maxGame === 0 ? 1 : maxGame;
		},
		targetGameNumber() {
			if (this.manualGameNumber) return this.manualGameNumber;
			if (this.gameState && this.gameState.currentGame) {
				return parseInt(this.gameState.currentGame.replace("g", "")) || 1;
			}
			return this.detectedGameNumber;
		},
	},
	methods: {
		setTheme(themeId) {
			gameStateRep.value.currentTheme = themeId;
		},
		selectGame(gameId) {
			displayStateRep.value.activeMedia = { id: null, fileUrl: null, type: null };
			displayStateRep.value.scoreboardExpanded = true;
			scoreRep.value = { experts: 0, sectors: 0 };

			let id = String(gameId);
			if (!id.startsWith("g")) id = "g" + id;

			gameStateRep.value.currentGame = id;
			console.log(`Система сброшена для ${gameId}. Экран очищен, счет обнулен.`);
		},
		confirmClearAllGames() {
			if (confirm("Вы уверены, что хотите УДАЛИТЬ ВСЕ загруженные файлы игр? Это действие необратимо.")) {
				if (confirm("Точно? Папка 'games' будет полностью очищена.")) {
					this.executeClearFolder();
				}
			}
		},
		executeClearFolder() {
			nodecg.sendMessage("clearGamesFolder", (error, success) => {
				if (error) {
					alert("Ошибка при очистке: " + error.message);
					return;
				}
				if (success) {
					alert("Папка очищена. Система готова к новому эфиру!");
				}
			});
		},
		addScore(side, delta) {
			const currentScore = scoreRep.value[side];
			const newScore = currentScore + delta;
			const validatedScore = Math.max(0, Math.min(6, newScore));
			if (validatedScore !== currentScore) {
				scoreRep.value[side] = validatedScore;
			} else {
				console.log(`Лимит достигнут: счет ${side} не может быть ${newScore}`);
			}
		},
		resetScore() {
			if (confirm("Вы точно хотите ОБНУЛИТЬ счет текущей игры?")) {
				scoreRep.value = { experts: 0, sectors: 0 };
			}
		},
		toggleScoreboard() {
			this.displayState.scoreboardExpanded = !this.displayState.scoreboardExpanded;
			displayStateRep.value.scoreboardExpanded = this.displayState.scoreboardExpanded;
		},
		playIntro() {
			this.displayState.isIntroPlaying = true;
			displayStateRep.value.isIntroPlaying = true;
		},
		forceReset() {
			displayStateRep.value.isIntroPlaying = false;
			displayStateRep.value.activeMedia = { id: null, fileUrl: null, type: null };
		},

		// --- МЕТОДЫ РАБОТЫ С МЕДИА (Формат: g1_5_q) ---

		hasGameAsset(sector, type, subIndex = null) {
			if (!this.assetsGames || this.assetsGames.length === 0) return false;
			if (!this.gameState || !this.gameState.currentGame) return false;

			const game = this.gameState.currentGame; // "g1"
			// Ищем точное совпадение имени: g1_5_q
			const searchName = subIndex ? `${game}_${sector}_${type}_${subIndex}` : `${game}_${sector}_${type}`;
			return this.assetsGames.some((file) => file.name === searchName);
		},
		getButtonClass(sector, type, subIndex = null) {
			if (!this.gameState || !this.gameState.currentGame) return "btn-outline-secondary";

			const game = this.gameState.currentGame;
			const assetId = subIndex ? `${game}_${sector}_${type}_${subIndex}` : `${game}_${sector}_${type}`;
			const exists = this.hasGameAsset(sector, type, subIndex);

			if (!exists) return "btn-outline-secondary";

			const isActive = this.displayState.activeMedia && this.displayState.activeMedia.id === assetId;
			if (isActive) return "btn-danger text-white";

			return type === "q" ? "btn-dark" : "btn-warning";
		},
		getGameAsset(sector, type, subIndex = null) {
			const game = this.gameState.currentGame;
			const searchName = subIndex ? `${game}_${sector}_${type}_${subIndex}` : `${game}_${sector}_${type}`;
			return this.assetsGames.find((file) => file.name === searchName);
		},
		handleMediaClick(sector, type, subIndex = null) {
			const asset = this.getGameAsset(sector, type, subIndex);
			if (!asset) return;

			const currentActive = this.displayState.activeMedia;
			if (currentActive && currentActive.id === asset.name) {
				this.clearMedia();
			} else {
				displayStateRep.value.activeMedia = {
					id: asset.name,
					fileUrl: asset.url,
					type: asset.ext === ".mp4" || asset.ext === ".mov" ? "video" : "image",
				};
				displayStateRep.value.scoreboardExpanded = true;
			}
		},
		clearMedia() {
			displayStateRep.value.activeMedia = { id: null, fileUrl: null, type: null };
			displayStateRep.value.scoreboardExpanded = false;
		},

		// --- МЕТОДЫ ЗАГРУЗЧИКА ---
		triggerUpload(sector, type, subIndex = null) {
			this.activeUpload = { sector, type, subIndex };
			this.$refs.gridFileInput.click();
		},
		onFileChange(e) {
			this.selectedFile = e.target.files[0];
			if (this.selectedFile && !this.uploadName) {
				this.uploadName = this.selectedFile.name;
			}
		},
		async handleGridUpload(e) {
			const file = e.target.files[0];
			if (!file) return;

			const gNum = this.targetGameNumber;
			const extension = file.name.split(".").pop();
			const { sector, type, subIndex } = this.activeUpload;

			// Формируем имя. Если есть subIndex, добавляем его в конец
			// Итог: g1_5_q_1.mp4 или g1_1_q.mp4
			let autoName = `g${gNum}_${sector}_${type}`;
			if (subIndex) autoName += `_${subIndex}`;
			autoName += `.${extension}`;

			const formData = new FormData();
			formData.append("customName", autoName);
			formData.append("file", file);

			try {
				const response = await fetch("/chgk-main/upload-game-file", {
					method: "POST",
					body: formData,
				});
				if (response.ok) console.log(`Загружен: ${autoName}`);
			} catch (err) {
				console.error("Ошибка загрузки:", err);
			}
			e.target.value = "";
		},
		isLoaded(sector, type, subIndex = null) {
			if (!this.assetsGames) return false;

			const gNum = this.targetGameNumber;
			let targetPrefix = `g${gNum}_${sector}_${type}`;

			// Если мы проверяем блиц, ищем точное совпадение с индексом
			if (subIndex) {
				targetPrefix += `_${subIndex}`;
			}

			return this.assetsGames.some((file) => file.name.startsWith(targetPrefix));
		},
	},
	mounted() {
		const clean = (val) => (val ? JSON.parse(JSON.stringify(val)) : val);
		NodeCG.waitForReplicants(scoreRep, gameStateRep, displayStateRep, assetsMainRep, assetsGamesRep).then(() => {
			scoreRep.on("change", (newVal) => {
				if (newVal) this.score = clean(newVal);
			});
			gameStateRep.on("change", (newVal) => {
				if (newVal) this.gameState = clean(newVal);
			});
			displayStateRep.on("change", (newVal) => {
				if (newVal) this.displayState = clean(newVal);
			});
			assetsMainRep.on("change", (newVal) => {
				if (newVal) this.assetsMain = clean(newVal) || [];
			});
			assetsGamesRep.on("change", (newVal) => {
				if (newVal) this.assetsGames = clean(newVal) || [];
			});
		});
	},
}).mount("#app");
