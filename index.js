const pensamentosDoRafinha = [
    "Essa fera aí, bicho",
    "HE HE",
    "Quem não programa, não come",
    "Talocs",
    "KARAKAS",
    "Uncle Rucus lançou a braba"
];

document.addEventListener("DOMContentLoaded", () => {
    const thoughtText = document.querySelector("#thoughtText");
    const thoughtButton = document.querySelector("#thoughtButton");
    const currentYear = document.querySelector("#currentYear");
    const header = document.querySelector(".site-header");
    const navToggle = document.querySelector(".nav-toggle");
    const siteMenu = document.querySelector("#site-menu");

    let currentThoughtIndex = -1;
    let thoughtTimer;

    function getNextThoughtIndex() {
        if (pensamentosDoRafinha.length <= 1) {
            return 0;
        }

        let nextIndex;

        do {
            nextIndex = Math.floor(Math.random() * pensamentosDoRafinha.length);
        } while (nextIndex === currentThoughtIndex);

        return nextIndex;
    }

    function showAnotherThought(animate = true) {
        if (!thoughtText || pensamentosDoRafinha.length === 0) {
            return;
        }

        const updateThought = () => {
            currentThoughtIndex = getNextThoughtIndex();
            thoughtText.textContent = `“${pensamentosDoRafinha[currentThoughtIndex]}”`;
            thoughtText.classList.remove("is-changing");
        };

        window.clearTimeout(thoughtTimer);

        if (!animate) {
            updateThought();
            return;
        }

        thoughtText.classList.add("is-changing");
        thoughtTimer = window.setTimeout(updateThought, 150);
    }

    function setMenuState(isOpen) {
        if (!navToggle || !siteMenu) {
            return;
        }

        navToggle.setAttribute("aria-expanded", String(isOpen));
        navToggle.setAttribute("aria-label", isOpen ? "Fechar menu" : "Abrir menu");
        siteMenu.classList.toggle("is-open", isOpen);
    }

    function updateHeader() {
        if (header) {
            header.classList.toggle("is-scrolled", window.scrollY > 12);
        }
    }

    if (currentYear) {
        currentYear.textContent = new Date().getFullYear();
    }

    showAnotherThought(false);
    updateHeader();

    thoughtButton?.addEventListener("click", () => showAnotherThought(true));

    navToggle?.addEventListener("click", () => {
        const isOpen = navToggle.getAttribute("aria-expanded") !== "true";
        setMenuState(isOpen);
    });

    siteMenu?.querySelectorAll("a").forEach((link) => {
        link.addEventListener("click", () => setMenuState(false));
    });

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
            setMenuState(false);
        }
    });

    window.addEventListener("scroll", updateHeader, { passive: true });

    window.addEventListener("resize", () => {
        if (window.innerWidth > 700) {
            setMenuState(false);
        }
    });
});
