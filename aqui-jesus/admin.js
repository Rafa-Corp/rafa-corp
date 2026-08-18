(() => {
    "use strict";

    const CONFIG = Object.freeze({
        owner: "Rafa-Corp",
        repository: "rafa-corp",
        label: "mentira-de-jesus"
    });

    const form = document.querySelector("#lieForm");
    const tokenInput = document.querySelector("#githubToken");
    const toggleToken = document.querySelector("#toggleToken");
    const lieInput = document.querySelector("#lieText");
    const verdictInput = document.querySelector("#verdict");
    const categoryInput = document.querySelector("#category");
    const truthInput = document.querySelector("#truthIndex");
    const publishButton = document.querySelector("#publishButton");
    const publishStatus = document.querySelector("#publishStatus");
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
    let publishing = false;

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

    function friendlyApiError(status, fallback) {
        const messages = {
            401: "Token inválido ou expirado.",
            403: "O token não tem permissão para publicar neste repositório.",
            404: "Repositório não encontrado ou token sem acesso.",
            409: "O GitHub encontrou um conflito. Atualize e tente novamente.",
            422: "O GitHub recusou a publicação. Confira a permissão Issues: Read and write."
        };

        return messages[status] || fallback || "O GitHub não aceitou a publicação.";
    }

    async function githubRequest(url, token, options = {}) {
        const response = await fetch(url, {
            ...options,
            cache: "no-store",
            headers: {
                Accept: "application/vnd.github+json",
                Authorization: `Bearer ${token}`,
                "X-GitHub-Api-Version": "2022-11-28",
                ...(options.body ? { "Content-Type": "application/json" } : {}),
                ...options.headers
            }
        });

        if (!response.ok) {
            let detail = "";

            try {
                const data = await response.json();
                detail = typeof data?.message === "string" ? data.message : "";
            } catch {
                detail = "";
            }

            throw new Error(friendlyApiError(response.status, detail));
        }

        return response.json();
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

            if (!post || typeof post.text !== "string" || !Number.isInteger(Number(post.number))) {
                return null;
            }

            return {
                ...post,
                id: `issue-${issue.number}`,
                createdAt: post.createdAt || issue.created_at
            };
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

        try {
            const issuesUrl = `https://api.github.com/repos/${CONFIG.owner}/${CONFIG.repository}/issues?state=open&labels=${encodeURIComponent(CONFIG.label)}&per_page=100&sort=created&direction=desc`;
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
            loadedPosts = [...seedPosts, ...issuePosts];
            nextNumber = calculateNextNumber(loadedPosts);
            renderArchive(loadedPosts);
            updateDraftNumber();
        } catch (error) {
            currentPosts.replaceChildren();
            const message = document.createElement("p");
            message.className = "loading-posts is-error";
            message.textContent = error.message;
            currentPosts.append(message);
        } finally {
            refreshButton.disabled = false;
        }
    }

    async function publish(event) {
        event.preventDefault();

        if (publishing) {
            return;
        }

        if (!form.reportValidity()) {
            setStatus("Revise os campos destacados antes de publicar.", "error");
            return;
        }

        const token = tokenInput.value.trim();

        if (token.length < 20) {
            setStatus("Informe um token de publicação válido.", "error");
            tokenInput.focus();
            return;
        }

        publishing = true;
        publishButton.disabled = true;
        setStatus("Conferindo o arquivo atual…", "working");

        const apiUrl = `https://api.github.com/repos/${CONFIG.owner}/${CONFIG.repository}/issues`;

        try {
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

            setStatus("Publicando na redação da RafaCorp…", "working");

            const createdIssue = await githubRequest(apiUrl, token, {
                method: "POST",
                body: JSON.stringify({
                    title: `Mentira de Jesus #${String(publicationNumber).padStart(3, "0")}`,
                    body: JSON.stringify(post, null, 2),
                    labels: [CONFIG.label]
                })
            });

            post.id = `issue-${createdIssue.number}`;
            lieInput.value = "";
            verdictInput.value = "";
            truthInput.value = "0";
            loadedPosts = [...loadedPosts, post];
            nextNumber = publicationNumber + 1;
            renderArchive(loadedPosts);
            updateDraftNumber();
            updatePreview();
            setStatus(`Mentira #${String(publicationNumber).padStart(3, "0")} publicada. Ela já aparece ao atualizar o arquivo público.`, "success");
        } catch (error) {
            setStatus(error.message || "Não foi possível publicar a mentira.", "error");
        } finally {
            publishing = false;
            publishButton.disabled = false;
        }
    }

    [lieInput, verdictInput, categoryInput, truthInput].forEach((input) => {
        input.addEventListener("input", updatePreview);
    });

    toggleToken.addEventListener("click", () => {
        const shouldShow = tokenInput.type === "password";
        tokenInput.type = shouldShow ? "text" : "password";
        toggleToken.textContent = shouldShow ? "Ocultar" : "Mostrar";
        toggleToken.setAttribute("aria-label", shouldShow ? "Ocultar token" : "Mostrar token");
    });

    refreshButton.addEventListener("click", loadPublicArchive);
    form.addEventListener("submit", publish);
    window.addEventListener("pagehide", () => {
        tokenInput.value = "";
    });

    updatePreview();
    updateDraftNumber();
    loadPublicArchive();
})();
