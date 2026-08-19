(() => {
    "use strict";

    const CONFIG = Object.freeze({
        owner: "Rafa-Corp",
        repository: "rafa-corp",
        label: "mentira-de-jesus",
        publicationPassword: "LINUX"
    });

    const form = document.querySelector("#lieForm");
    const passwordInput = document.querySelector("#publicationPassword");
    const togglePassword = document.querySelector("#togglePassword");
    const lieInput = document.querySelector("#lieText");
    const verdictInput = document.querySelector("#verdict");
    const categoryInput = document.querySelector("#category");
    const truthInput = document.querySelector("#truthIndex");
    const publishStatus = document.querySelector("#publishStatus");
    const publishButton = document.querySelector("#publishButton");
    const refreshButton = document.querySelector("#refreshPosts");
    const currentPosts = document.querySelector("#currentPosts");
    const draftNumber = document.querySelector("#draftNumber");
    const previewNumber = document.querySelector("#previewNumber");
    const previewText = document.querySelector("#previewText");
    const previewVerdict = document.querySelector("#previewVerdict");
    const previewCategory = document.querySelector("#previewCategory");
    const previewTruth = document.querySelector("#previewTruth");
    const lieCount = document.querySelector("#lieCount");
    const verdictCount = document.querySelector("#verdictCount");

    let loadedPosts = [];
    let nextNumber = 6;
    let dynamicArchiveReady = false;

    function setStatus(message, type = "neutral") {
        publishStatus.textContent = message;
        publishStatus.dataset.type = type;
    }

    function cleanText(value, maximum) {
        return String(value || "").trim().slice(0, maximum);
    }

    function calculateNextNumber(posts) {
        const highest = posts.reduce((current, post) => {
            const number = Number(post?.number);
            return Number.isInteger(number) ? Math.max(current, number) : current;
        }, 5);

        return highest + 1;
    }

    function normalizeArchivePost(post) {
        const number = Number(post?.number);
        const truthIndex = Number(post?.truthIndex);
        const createdAt = new Date(post?.createdAt);

        if (
            !post ||
            typeof post.text !== "string" ||
            typeof post.verdict !== "string" ||
            typeof post.category !== "string" ||
            !Number.isInteger(number) ||
            number < 1 ||
            !Number.isFinite(truthIndex) ||
            Number.isNaN(createdAt.getTime())
        ) {
            return null;
        }

        return {
            ...post,
            number,
            text: cleanText(post.text, 320),
            verdict: cleanText(post.verdict, 220),
            category: cleanText(post.category, 60),
            truthIndex: Math.min(100, Math.max(0, Math.round(truthIndex))),
            createdAt: createdAt.toISOString()
        };
    }

    function deduplicatePosts(posts) {
        const uniquePosts = new Map();

        posts.forEach((post) => {
            const normalizedPost = normalizeArchivePost(post);

            if (!normalizedPost) {
                return;
            }

            const existing = uniquePosts.get(normalizedPost.number);

            if (!existing || normalizedPost.createdAt >= existing.createdAt) {
                uniquePosts.set(normalizedPost.number, normalizedPost);
            }
        });

        return [...uniquePosts.values()];
    }

    function setArchiveReady(isReady) {
        dynamicArchiveReady = isReady;
        publishButton.disabled = !isReady;
    }

    function updateDraftNumber() {
        const formatted = `#${String(nextNumber).padStart(3, "0")}`;
        draftNumber.textContent = formatted;
        previewNumber.textContent = `MENTIRA ${formatted}`;
    }

    function updatePreview() {
        const lie = cleanText(lieInput.value, 320);
        const verdict = cleanText(verdictInput.value, 220);
        const category = cleanText(categoryInput.value, 60);
        const truth = Math.min(100, Math.max(0, Number(truthInput.value) || 0));

        lieCount.value = String(lieInput.value.length);
        verdictCount.value = String(verdictInput.value.length);
        previewText.textContent = lie ? `“${lie}”` : "“Sua próxima mentira aparece aqui.”";
        previewVerdict.textContent = verdict || "O comentário da redação aparece aqui.";
        previewCategory.textContent = (category || "Sem categoria").toUpperCase();
        previewTruth.textContent = `${truth}% verdade`;
    }

    function createArchiveItem(post) {
        const article = document.createElement("article");
        article.className = "archive-item";

        const number = document.createElement("span");
        number.textContent = `#${String(post.number).padStart(3, "0")}`;

        const content = document.createElement("div");
        const title = document.createElement("h3");
        title.textContent = post.text;
        const metadata = document.createElement("p");
        const createdAt = new Date(post.createdAt);
        const date = Number.isNaN(createdAt.getTime())
            ? "data desconhecida"
            : new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(createdAt);
        metadata.textContent = `${post.category} · ${date} · ${post.truthIndex}% verdade`;

        content.append(title, metadata);
        article.append(number, content);
        return article;
    }

    function parseIssue(issue) {
        if (!issue || issue.pull_request || typeof issue.body !== "string") {
            return null;
        }

        try {
            const post = JSON.parse(issue.body);

            return normalizeArchivePost({
                ...post,
                id: `issue-${issue.number}`,
                createdAt: post.createdAt || issue.created_at
            });
        } catch {
            return null;
        }
    }

    function renderArchive(posts) {
        currentPosts.replaceChildren();

        if (posts.length === 0) {
            const empty = document.createElement("p");
            empty.className = "loading-posts";
            empty.textContent = "Nenhuma publicação dinâmica ainda.";
            currentPosts.append(empty);
            return;
        }

        const fragment = document.createDocumentFragment();
        [...posts]
            .sort((a, b) => Number(b.number) - Number(a.number))
            .forEach((post) => fragment.append(createArchiveItem(post)));
        currentPosts.append(fragment);
    }

    async function loadPublicArchive() {
        refreshButton.disabled = true;
        setArchiveReady(false);
        setStatus("Conferindo a numeração no GitHub…", "working");

        try {
            const issuesUrl = `https://api.github.com/repos/${CONFIG.owner}/${CONFIG.repository}/issues?state=all&labels=${encodeURIComponent(CONFIG.label)}&per_page=100&sort=created&direction=desc`;
            const [seedResult, issuesResult] = await Promise.allSettled([
                fetch(`../mentiras.json?time=${Date.now()}`, { cache: "no-store" }),
                fetch(issuesUrl, {
                    cache: "no-store",
                    headers: { Accept: "application/vnd.github+json" }
                })
            ]);
            const seedResponse = seedResult.status === "fulfilled" ? seedResult.value : null;
            const issuesResponse = issuesResult.status === "fulfilled" ? issuesResult.value : null;

            if (!seedResponse?.ok && !issuesResponse?.ok) {
                throw new Error("Não foi possível carregar as publicações atuais.");
            }

            const seedData = seedResponse?.ok ? await seedResponse.json() : { posts: [] };
            const issueData = issuesResponse?.ok ? await issuesResponse.json() : [];
            const seedPosts = Array.isArray(seedData?.posts) ? seedData.posts : [];
            const issuePosts = Array.isArray(issueData) ? issueData.map(parseIssue).filter(Boolean) : [];
            loadedPosts = deduplicatePosts([...seedPosts, ...issuePosts]);
            nextNumber = calculateNextNumber(loadedPosts);
            renderArchive(loadedPosts);
            updateDraftNumber();

            if (issuesResponse?.ok) {
                setArchiveReady(true);
                setStatus("Arquivo conferido. Pronto para preparar uma nova publicação.", "success");
            } else {
                setStatus("O arquivo do GitHub está indisponível. Atualize o arquivo antes de publicar.", "error");
            }
        } catch (error) {
            currentPosts.replaceChildren();
            const message = document.createElement("p");
            message.className = "loading-posts is-error";
            message.textContent = error.message;
            currentPosts.append(message);
            setStatus("Não foi possível conferir a numeração. Atualize o arquivo antes de publicar.", "error");
        } finally {
            refreshButton.disabled = false;
        }
    }

    function createPublicationUrl(post) {
        const url = new URL(`https://github.com/${CONFIG.owner}/${CONFIG.repository}/issues/new`);
        url.searchParams.set("labels", CONFIG.label);
        url.searchParams.set("title", `Mentira de Jesus #${String(post.number).padStart(3, "0")}`);
        url.searchParams.set("body", JSON.stringify(post, null, 2));
        return url.toString();
    }

    function publish(event) {
        event.preventDefault();

        if (!dynamicArchiveReady) {
            setStatus("Atualize o arquivo e aguarde a conferência do GitHub antes de publicar.", "error");
            refreshButton.focus();
            return;
        }

        if (!form.reportValidity()) {
            setStatus("Revise os campos destacados antes de publicar.", "error");
            return;
        }

        if (passwordInput.value.trim().toUpperCase() !== CONFIG.publicationPassword) {
            setStatus("Senha incorreta. Consulte a chefia editorial.", "error");
            passwordInput.focus();
            passwordInput.select();
            return;
        }

        const publicationNumber = calculateNextNumber(loadedPosts);
        const now = new Date();
        const post = {
            id: `mentira-${publicationNumber}-${now.getTime()}`,
            number: publicationNumber,
            text: cleanText(lieInput.value, 320),
            verdict: cleanText(verdictInput.value, 220),
            category: cleanText(categoryInput.value, 60),
            truthIndex: Math.min(100, Math.max(0, Math.round(Number(truthInput.value)))),
            createdAt: now.toISOString(),
            author: "Jesus"
        };

        passwordInput.value = "";
        setStatus("Mentira preparada. Abrindo a confirmação no GitHub…", "working");
        window.location.assign(createPublicationUrl(post));
    }

    [lieInput, verdictInput, categoryInput, truthInput].forEach((input) => {
        input.addEventListener("input", updatePreview);
    });

    togglePassword.addEventListener("click", () => {
        const shouldShow = passwordInput.type === "password";
        passwordInput.type = shouldShow ? "text" : "password";
        togglePassword.textContent = shouldShow ? "Ocultar" : "Mostrar";
        togglePassword.setAttribute("aria-label", shouldShow ? "Ocultar senha" : "Mostrar senha");
    });

    refreshButton.addEventListener("click", loadPublicArchive);
    form.addEventListener("submit", publish);
    window.addEventListener("pagehide", () => {
        passwordInput.value = "";
    });

    updatePreview();
    updateDraftNumber();
    loadPublicArchive();
})();
