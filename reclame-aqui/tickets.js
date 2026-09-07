(() => {
    "use strict";

    const CONFIG = Object.freeze({
        owner: "Rafa-Corp",
        repository: "rafa-corp",
        ticketLabel: "ticket"
    });

    const STATUS = Object.freeze({
        aberta: "Aberta",
        "em-analise": "Em análise",
        "aguardando-cliente": "Aguardando cliente",
        respondida: "Respondida",
        resolvida: "Resolvida",
        encerrada: "Encerrada"
    });

    const TYPE = Object.freeze({
        reclamacao: "Reclamação",
        sugestao: "Sugestão"
    });

    const form = document.querySelector("#ticketForm");
    const typeInput = document.querySelector("#ticketType");
    const subjectInput = document.querySelector("#ticketSubject");
    const descriptionInput = document.querySelector("#ticketDescription");
    const subjectCount = document.querySelector("#ticketSubjectCount");
    const descriptionCount = document.querySelector("#ticketDescriptionCount");
    const formStatus = document.querySelector("#ticketFormStatus");
    const lookupForm = document.querySelector("#ticketLookupForm");
    const lookupInput = document.querySelector("#ticketLookup");
    const lookupStatus = document.querySelector("#ticketLookupStatus");
    const searchInput = document.querySelector("#ticketSearch");
    const typeFilter = document.querySelector("#ticketTypeFilter");
    const statusFilter = document.querySelector("#ticketStatusFilter");
    const feed = document.querySelector("#ticketFeed");
    const count = document.querySelector("#ticketCount");
    const feedStatus = document.querySelector("#ticketFeedStatus");

    let tickets = [];

    if (!form || !feed) {
        return;
    }

    function cleanText(value, maximum) {
        return String(value || "").trim().slice(0, maximum);
    }

    function formatDate(value) {
        const date = new Date(value);

        if (Number.isNaN(date.getTime())) {
            return "data indisponível";
        }

        return new Intl.DateTimeFormat("pt-BR", {
            dateStyle: "medium",
            timeStyle: "short"
        }).format(date);
    }

    function getStatus(labels) {
        const statusLabel = labels.find((label) => label.name.startsWith("status:"));
        const key = statusLabel?.name.replace("status:", "") || "aberta";

        return {
            key: Object.hasOwn(STATUS, key) ? key : "aberta",
            label: Object.hasOwn(STATUS, key) ? STATUS[key] : STATUS.aberta
        };
    }

    function getType(labels, metadata) {
        const typeLabel = labels.find((label) => label.name.startsWith("tipo:"));
        const key = typeLabel?.name.replace("tipo:", "") || metadata?.type || "reclamacao";

        return {
            key: Object.hasOwn(TYPE, key) ? key : "reclamacao",
            label: Object.hasOwn(TYPE, key) ? TYPE[key] : TYPE.reclamacao
        };
    }

    function parseTicketBody(body) {
        const source = typeof body === "string" ? body : "";
        const marker = /^<!--\s*RAFACORP_TICKET\s*\n([\s\S]*?)\n-->\s*/;
        const match = source.match(marker);
        let metadata = null;

        if (match) {
            try {
                metadata = JSON.parse(match[1]);
            } catch {
                metadata = null;
            }
        }

        const description = source
            .replace(marker, "")
            .replace(/^##\s*Detalhes do ticket\s*/i, "")
            .trim();

        return { metadata, description };
    }

    function normalizeTicket(issue) {
        if (!issue || issue.pull_request || !Number.isInteger(Number(issue.number))) {
            return null;
        }

        const labels = Array.isArray(issue.labels) ? issue.labels : [];
        const parsed = parseTicketBody(issue.body);
        const status = getStatus(labels);
        const type = getType(labels, parsed.metadata);

        return {
            protocol: Number(issue.number),
            subject: cleanText(issue.title, 160).replace(/^\[[^\]]+\]\s*/, "") || "Ticket sem assunto",
            description: cleanText(parsed.description, 2000) || "Sem detalhes adicionais.",
            createdAt: issue.created_at,
            updatedAt: issue.updated_at,
            url: issue.html_url,
            status,
            type
        };
    }

    function createTicketCard(ticket) {
        const article = document.createElement("article");
        article.className = "ticket-card";
        article.dataset.protocol = String(ticket.protocol);

        const header = document.createElement("div");
        header.className = "ticket-card-header";

        const protocol = document.createElement("span");
        protocol.textContent = `PROTOCOLO #${ticket.protocol}`;

        const status = document.createElement("span");
        status.className = "ticket-status";
        status.dataset.status = ticket.status.key;
        status.textContent = ticket.status.label;

        header.append(protocol, status);

        const type = document.createElement("p");
        type.className = "ticket-card-type";
        type.textContent = ticket.type.label;

        const title = document.createElement("h3");
        title.textContent = ticket.subject;

        const description = document.createElement("p");
        description.className = "ticket-card-description";
        description.textContent = ticket.description;

        const footer = document.createElement("div");
        footer.className = "ticket-card-footer";

        const updated = document.createElement("time");
        updated.dateTime = ticket.updatedAt || ticket.createdAt;
        updated.textContent = `Atualizado em ${formatDate(ticket.updatedAt || ticket.createdAt)}`;

        const link = document.createElement("a");
        link.href = ticket.url;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.textContent = "Ver histórico";
        link.append(document.createTextNode(" ↗"));

        footer.append(updated, link);
        article.append(header, type, title, description, footer);

        return article;
    }

    function getFilteredTickets() {
        const rawQuery = cleanText(searchInput?.value, 160);
        const query = rawQuery.replace(/^#(?=\d+$)/, "").toLocaleLowerCase("pt-BR");
        const selectedType = typeFilter?.value || "";
        const selectedStatus = statusFilter?.value || "";

        return tickets.filter((ticket) => {
            const matchesQuery = !query || [
                String(ticket.protocol),
                ticket.subject,
                ticket.description,
                ticket.type.label,
                ticket.status.label
            ].some((value) => value.toLocaleLowerCase("pt-BR").includes(query));

            return matchesQuery &&
                (!selectedType || ticket.type.key === selectedType) &&
                (!selectedStatus || ticket.status.key === selectedStatus);
        });
    }

    function renderTickets() {
        const visibleTickets = getFilteredTickets();
        feed.replaceChildren();

        count.textContent = `${visibleTickets.length} ${visibleTickets.length === 1 ? "ticket encontrado" : "tickets encontrados"}`;

        if (visibleTickets.length === 0) {
            const empty = document.createElement("p");
            empty.className = "ticket-empty";
            empty.textContent = tickets.length === 0
                ? "Ainda não há tickets públicos. Seja a primeira pessoa a abrir um."
                : "Nenhum ticket corresponde aos filtros informados.";
            feed.append(empty);
            return;
        }

        const fragment = document.createDocumentFragment();
        visibleTickets.forEach((ticket) => fragment.append(createTicketCard(ticket)));
        feed.append(fragment);
    }

    function updateCounters() {
        subjectCount.value = String(subjectInput.value.length);
        descriptionCount.value = String(descriptionInput.value.length);
    }

    function createIssueUrl(ticket) {
        const metadata = {
            version: 1,
            kind: "ticket",
            type: ticket.type,
            submittedAt: new Date().toISOString()
        };
        const issueUrl = new URL(`https://github.com/${CONFIG.owner}/${CONFIG.repository}/issues/new`);
        const typeLabel = TYPE[ticket.type];
        const body = [
            "<!-- RAFACORP_TICKET",
            JSON.stringify(metadata),
            "-->",
            "",
            "## Detalhes do ticket",
            "",
            ticket.description
        ].join("\n");

        issueUrl.searchParams.set("labels", [
            CONFIG.ticketLabel,
            `tipo:${ticket.type}`,
            "status:aberta"
        ].join(","));
        issueUrl.searchParams.set("title", `[${typeLabel}] ${ticket.subject}`);
        issueUrl.searchParams.set("body", body);

        return issueUrl.toString();
    }

    async function loadTickets() {
        feedStatus.textContent = "";

        try {
            const issueUrl = new URL(`https://api.github.com/repos/${CONFIG.owner}/${CONFIG.repository}/issues`);
            issueUrl.searchParams.set("state", "all");
            issueUrl.searchParams.set("labels", CONFIG.ticketLabel);
            issueUrl.searchParams.set("per_page", "100");
            issueUrl.searchParams.set("sort", "updated");
            issueUrl.searchParams.set("direction", "desc");

            const response = await fetch(issueUrl, {
                cache: "no-store",
                headers: { Accept: "application/vnd.github+json" }
            });

            if (!response.ok) {
                throw new Error("A fila pública está indisponível no momento.");
            }

            const data = await response.json();
            tickets = Array.isArray(data) ? data.map(normalizeTicket).filter(Boolean) : [];
            renderTickets();
        } catch {
            tickets = [];
            count.textContent = "Fila temporariamente indisponível";
            feed.replaceChildren();

            const error = document.createElement("p");
            error.className = "ticket-empty is-error";
            error.textContent = "Não foi possível carregar os tickets agora. Tente novamente em alguns instantes.";
            feed.append(error);
            feedStatus.textContent = "A criação de novos tickets continua disponível pelo formulário acima.";
        }
    }

    form.addEventListener("submit", (event) => {
        event.preventDefault();

        if (!form.reportValidity()) {
            formStatus.textContent = "Revise os campos destacados antes de continuar.";
            formStatus.dataset.type = "error";
            return;
        }

        const ticket = {
            type: typeInput.value,
            subject: cleanText(subjectInput.value, 120),
            description: cleanText(descriptionInput.value, 2000)
        };

        formStatus.textContent = "Abrindo a confirmação no GitHub. Após enviar, o número da Issue será seu protocolo.";
        formStatus.dataset.type = "working";
        window.location.assign(createIssueUrl(ticket));
    });

    lookupForm?.addEventListener("submit", (event) => {
        event.preventDefault();
        const protocol = cleanText(lookupInput.value, 30).replace(/^#/, "");

        if (!/^\d+$/.test(protocol)) {
            lookupStatus.textContent = "Informe um número de protocolo válido, como #42.";
            return;
        }

        const ticket = tickets.find((item) => item.protocol === Number(protocol));
        searchInput.value = `#${protocol}`;
        renderTickets();

        if (!ticket) {
            lookupStatus.textContent = "Não encontramos um ticket público com esse protocolo.";
            return;
        }

        lookupStatus.textContent = `Protocolo #${protocol} encontrado: ${ticket.status.label}.`;
        document.querySelector(`[data-protocol="${ticket.protocol}"]`)?.scrollIntoView({
            behavior: "smooth",
            block: "center"
        });
    });

    [subjectInput, descriptionInput].forEach((input) => input.addEventListener("input", updateCounters));
    [searchInput, typeFilter, statusFilter].forEach((input) => input?.addEventListener("input", renderTickets));
    [typeFilter, statusFilter].forEach((input) => input?.addEventListener("change", renderTickets));

    updateCounters();
    loadTickets();
})();
