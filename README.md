# RafaCorp

Site institucional estático da RafaCorp, publicado em [rafacorp.com](https://rafacorp.com/).

## Estrutura

- `index.html`: página principal, incluindo as estatísticas do Dota do CEO.
- `mentiras-de-jesus.html`: arquivo público das Mentiras de Jesus.
- `reclame-aqui/`: central pública de tickets para reclamações e sugestões.
- `aqui-jesus/`: área não listada no site para preparar novas publicações.
- `style.css` e `index.js`: estilos e interações compartilhadas das páginas públicas.
- `dota.js`: consulta o OpenDota e mantém uma fotografia local de segurança.
- `mentiras.js` e `mentiras.json`: carregamento do arquivo público e publicação inicial.

## Publicação das Mentiras de Jesus

A área `/aqui-jesus/` prepara uma Issue do GitHub com o conteúdo preenchido. A senha fixa libera apenas essa preparação no navegador; a publicação real ainda exige uma conta autorizada no GitHub. Nenhum token ou credencial é armazenado pelo site.

## Reclame Aqui

A rota `/reclame-aqui/` usa as Issues públicas do repositório como fila de tickets. O formulário prepara uma Issue com as etiquetas de tipo e status; o número da Issue é o protocolo. A equipe responde, altera o status e encerra os tickets diretamente no GitHub. Como o histórico é público, essa central não aceita dados pessoais, senhas, documentos ou anexos confidenciais.

## Desenvolvimento local

O projeto não exige compilação. Sirva a pasta por HTTP para testar os caminhos e as requisições dinâmicas; abrir os arquivos diretamente pode bloquear algumas consultas do navegador.
