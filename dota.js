(() => {
    "use strict";

    const PLAYER_ID = "75694096";
    const MINIMUM_HERO_GAMES = 10;
    const API_BASE = "https://api.opendota.com/api";
    const FALLBACK = Object.freeze({
        wins: 364,
        losses: 387,
        bestHero: {
            name: "Clinkz",
            games: 15,
            wins: 10
        }
    });

    const elements = {
        dashboard: document.querySelector("#dotaDashboard"),
        wins: document.querySelector("#dotaWins"),
        losses: document.querySelector("#dotaLosses"),
        total: document.querySelector("#dotaTotal"),
        winrate: document.querySelector("#dotaWinrate"),
        winrateRing: document.querySelector("#dotaWinrateRing"),
        bestHero: document.querySelector("#dotaBestHero"),
        bestHeroSummary: document.querySelector("#dotaBestHeroSummary"),
        bestHeroWins: document.querySelector("#dotaBestHeroWins"),
        bestHeroGames: document.querySelector("#dotaBestHeroGames"),
        status: document.querySelector("#dotaDataStatus"),
        statusText: document.querySelector("#dotaDataStatusText"),
        updated: document.querySelector("#dotaUpdated")
    };

    if (!elements.dashboard) {
        return;
    }

    function formatNumber(value) {
        return new Intl.NumberFormat("pt-BR").format(value);
    }

    function formatPercent(value) {
        return new Intl.NumberFormat("pt-BR", {
            minimumFractionDigits: 1,
            maximumFractionDigits: 1
        }).format(value);
    }

    function getBestHero(playerHeroes, heroCatalog) {
        const heroNames = new Map(
            heroCatalog.map((hero) => [Number(hero.id), hero.localized_name])
        );

        return playerHeroes
            .map((hero) => ({
                id: Number(hero.hero_id),
                games: Number(hero.games),
                wins: Number(hero.win)
            }))
            .filter((hero) => (
                Number.isInteger(hero.id) &&
                Number.isFinite(hero.games) &&
                Number.isFinite(hero.wins) &&
                hero.games >= MINIMUM_HERO_GAMES &&
                hero.wins >= 0 &&
                hero.wins <= hero.games &&
                heroNames.has(hero.id)
            ))
            .map((hero) => ({
                ...hero,
                name: heroNames.get(hero.id),
                winrate: (hero.wins / hero.games) * 100
            }))
            .sort((a, b) => (
                b.winrate - a.winrate ||
                b.games - a.games ||
                b.wins - a.wins
            ))[0] || null;
    }

    function normalizeData(winLoss, playerHeroes, heroCatalog) {
        const wins = Number(winLoss?.win);
        const losses = Number(winLoss?.lose);
        const bestHero = getBestHero(playerHeroes, heroCatalog);

        if (
            !Number.isInteger(wins) ||
            !Number.isInteger(losses) ||
            wins < 0 ||
            losses < 0 ||
            !bestHero
        ) {
            throw new Error("Dados incompletos do OpenDota.");
        }

        return { wins, losses, bestHero };
    }

    function render(data, isLive) {
        const total = data.wins + data.losses;
        const winrate = total > 0 ? (data.wins / total) * 100 : 0;
        const heroWinrate = data.bestHero.games > 0
            ? (data.bestHero.wins / data.bestHero.games) * 100
            : 0;

        elements.wins.textContent = formatNumber(data.wins);
        elements.losses.textContent = formatNumber(data.losses);
        elements.total.textContent = formatNumber(total);
        elements.winrate.textContent = `${formatPercent(winrate)}%`;
        elements.winrateRing.style.setProperty("--win-angle", `${winrate * 3.6}deg`);
        elements.winrateRing.setAttribute(
            "aria-label",
            `Aproveitamento geral: ${formatPercent(winrate)}%`
        );
        elements.bestHero.textContent = data.bestHero.name;
        elements.bestHeroSummary.textContent = `${formatPercent(heroWinrate)}% de vitórias`;
        elements.bestHeroWins.textContent = formatNumber(data.bestHero.wins);
        elements.bestHeroGames.textContent = formatNumber(data.bestHero.games);

        if (isLive) {
            elements.status.classList.remove("is-fallback");
            elements.statusText.textContent = "OpenDota ao vivo";
            elements.updated.textContent = `Dados atualizados via OpenDota em ${new Intl.DateTimeFormat("pt-BR", {
                dateStyle: "long",
                timeStyle: "short"
            }).format(new Date())}.`;
            return;
        }

        elements.status.classList.add("is-fallback");
        elements.statusText.textContent = "Fotografia de segurança";
        elements.updated.textContent = "OpenDota indisponível no momento. Exibindo a fotografia de 18 de agosto de 2026.";
    }

    async function requestJson(path) {
        const response = await fetch(`${API_BASE}${path}`, {
            cache: "no-store",
            headers: { Accept: "application/json" }
        });

        if (!response.ok) {
            throw new Error(`OpenDota respondeu com status ${response.status}.`);
        }

        return response.json();
    }

    async function loadDotaData() {
        render(FALLBACK, false);

        try {
            const [winLoss, playerHeroes, heroCatalog] = await Promise.all([
                requestJson(`/players/${PLAYER_ID}/wl`),
                requestJson(`/players/${PLAYER_ID}/heroes`),
                requestJson("/heroes")
            ]);

            render(normalizeData(winLoss, playerHeroes, heroCatalog), true);
        } catch {
            render(FALLBACK, false);
        }
    }

    loadDotaData();
})();
