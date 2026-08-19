(() => {
    "use strict";

    const section = document.querySelector("#publishedLiesSection");
    const feed = document.querySelector("#publishedLies");
    const status = document.querySelector("#publishedLiesStatus");
    const issuesUrl = "https://api.github.com/repos/Rafa-Corp/rafa-corp/issues?state=all&labels=mentira-de-jesus&per_page=100&sort=created&direction=desc";

    if (!section || !feed || !status) {
        return;
    }

    function normalizePost(post) {
        const truthIndex = Number(post?.truthIndex);
        const number = Number(post?.number);
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
            id: String(post.id || `mentira-${number}`),
            number,
            text: post.text.trim().slice(0, 320),
            verdict: post.verdict.trim().slice(0, 220),
            category: post.category.trim().slice(0, 60),
            truthIndex: Math.min(100, Math.max(0, Math.round(truthIndex))),
            createdAt,
            author: typeof post.author === "string" ? post.author.trim().slice(0, 40) : "Jesus"
        };
    }

    function formatDate(date) {
        return new Intl.DateTimeFormat("pt-BR", {
            day: "2-digit",
            month: "short",
            year: "numeric"
        }).format(date);
    }

    function createPostCard(post) {
        const article = document.createElement("article");
        article.className = "published-lie-card";
        article.dataset.postId = post.id;

        const header = document.createElement("div");
        header.className = "published-lie-topline";

        const number = document.createElement("span");
        number.textContent = `MENTIRA #${String(post.number).padStart(3, "0")}`;

        const time = document.createElement("time");
        time.dateTime = post.createdAt.toISOString();
        time.textContent = formatDate(post.createdAt);

        const category = document.createElement("p");
        category.className = "published-lie-category";
        category.textContent = post.category;

        const quote = document.createElement("blockquote");
        quote.textContent = `“${post.text}”`;

        const footer = document.createElement("div");
        footer.className = "published-lie-footer";

        const verdict = document.createElement("p");
        verdict.textContent = post.verdict;

        const meter = document.createElement("span");
        meter.className = "published-truth-index";
        meter.textContent = `${post.truthIndex}% verdade`;

        const author = document.createElement("small");
        author.textContent = `Publicado por ${post.author || "Jesus"}`;

        header.append(number, time);
        footer.append(verdict, meter);
        article.append(header, category, quote, footer, author);

        return article;
    }

    function renderPosts(rawPosts) {
        const uniquePosts = new Map();

        rawPosts
            .map(normalizePost)
            .filter(Boolean)
            .forEach((post) => {
                const existing = uniquePosts.get(post.number);

                if (!existing || post.createdAt >= existing.createdAt) {
                    uniquePosts.set(post.number, post);
                }
            });

        const posts = [...uniquePosts.values()]
            .sort((a, b) => b.createdAt - a.createdAt);

        feed.replaceChildren();

        if (posts.length === 0) {
            section.hidden = true;
            return;
        }

        const fragment = document.createDocumentFragment();
        posts.forEach((post) => fragment.append(createPostCard(post)));
        feed.append(fragment);
        section.hidden = false;
    }

    function parseIssue(issue) {
        if (!issue || issue.pull_request || typeof issue.body !== "string") {
            return null;
        }

        try {
            const post = JSON.parse(issue.body);

            return {
                ...post,
                id: `issue-${issue.number}`,
                createdAt: post.createdAt || issue.created_at
            };
        } catch {
            return null;
        }
    }

    async function loadPosts() {
        status.hidden = true;
        status.textContent = "";

        try {
            const [seedResult, issuesResult] = await Promise.allSettled([
                fetch("mentiras.json", { cache: "no-store" }),
                fetch(issuesUrl, {
                    cache: "no-store",
                    headers: { Accept: "application/vnd.github+json" }
                })
            ]);
            const seedResponse = seedResult.status === "fulfilled" ? seedResult.value : null;
            const issuesResponse = issuesResult.status === "fulfilled" ? issuesResult.value : null;

            if (!seedResponse?.ok && !issuesResponse?.ok) {
                throw new Error("Falha ao carregar as novas mentiras.");
            }

            const seedData = seedResponse?.ok ? await seedResponse.json() : { posts: [] };
            const issuesData = issuesResponse?.ok ? await issuesResponse.json() : [];
            const seedPosts = Array.isArray(seedData?.posts) ? seedData.posts : [];
            const issuePosts = Array.isArray(issuesData)
                ? issuesData.map(parseIssue).filter(Boolean)
                : [];

            renderPosts([...seedPosts, ...issuePosts]);

            if (!issuesResponse?.ok && seedPosts.length > 0) {
                status.textContent = "O arquivo ao vivo está temporariamente indisponível. Exibindo as publicações salvas.";
                status.hidden = false;
            }
        } catch (error) {
            section.hidden = true;
            status.hidden = true;
            console.error("Não foi possível carregar as novas mentiras.", error);
        }
    }

    loadPosts();
})();
