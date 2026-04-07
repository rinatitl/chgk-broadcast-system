"use strict";

const fs = require("fs");
const path = require("path");
const express = require("express");
const multer = require("multer");

module.exports = function (nodecg) {
	// Репликант для счета
	nodecg.Replicant("score", {
		defaultValue: { experts: 0, sectors: 0 },
	});

	nodecg.Replicant("gameState", {
		defaultValue: {
			currentTheme: "youth", // youth, amateur, corporate, monochrome
			currentGame: "g1",
		},
	});

	nodecg.Replicant("displayState", {
		defaultValue: {
			scoreboardExpanded: true,
			isIntroPlaying: false,
			activeMedia: {
				id: null,
				fileUrl: null,
				type: null,
			},
		},
	});

	const gamesDir = path.join(__dirname, "../../assets/chgk-main/games");

	const storage = multer.diskStorage({
		destination: function (req, file, cb) {
			cb(null, gamesDir);
		},
		filename: function (req, file, cb) {
			const name = req.body.customName || file.originalname;
			cb(null, name);
		},
	});

	const upload = multer({ storage: storage });

	const router = express.Router();

	router.post("/upload-game-file", upload.single("file"), (req, res) => {
		if (!req.file) {
			return res.status(400).send("Файл не загружен");
		}
		console.log(`[CHGK] Файл загружен: ${req.file.filename}`);
		res.status(200).send({ message: "Success", filename: req.file.filename });
	});

	nodecg.mount("/chgk-main", router);

	nodecg.listenFor("clearGamesFolder", (data, cb) => {
		if (!fs.existsSync(gamesDir)) {
			console.error(`[CHGK] Ошибка: Путь не найден! Проверь: ${gamesDir}`);
			if (cb && !cb.handled) cb(new Error(`Папка не найдена по пути: ${gamesDir}`));
			return;
		}

		try {
			const files = fs.readdirSync(gamesDir);
			let deletedCount = 0;

			files.forEach((file) => {
				const filePath = path.join(gamesDir, file);
				if (fs.lstatSync(filePath).isFile()) {
					fs.unlinkSync(filePath);
					deletedCount++;
				}
			});

			console.log(`[CHGK] Успешно удалено файлов: ${deletedCount}`);
			if (cb && !cb.handled) cb(null, true);
		} catch (err) {
			console.error(`[CHGK] Критическая ошибка при удалении:`, err);
			if (cb && !cb.handled) cb(err);
		}
	});
};
