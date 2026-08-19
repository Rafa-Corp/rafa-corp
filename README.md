# RafaCorp

Site institucional estático da RafaCorp, publicado em [rafacorp.com](https://rafacorp.com/).

## Estrutura

- `index.html`: página principal, incluindo as estatísticas do Dota do CEO.
- `mentiras-de-jesus.html`: arquivo público das Mentiras de Jesus.
- `aqui-jesus/`: área não listada no site para preparar novas publicações.
- `style.css` e `index.js`: estilos e interações compartilhadas das páginas públicas.
- `dota.js`: consulta o OpenDota e mantém uma fotografia local de segurança.
- `mentiras.js` e `mentiras.json`: carregamento do arquivo público e publicação inicial.

## Publicação das Mentiras de Jesus

A área `/aqui-jesus/` prepara uma Issue do GitHub com o conteúdo preenchido. A senha fixa libera apenas essa preparação no navegador; a publicação real ainda exige uma conta autorizada no GitHub. Nenhum token ou credencial é armazenado pelo site.

## Desenvolvimento local

O projeto não exige compilação. Sirva a pasta por HTTP para testar os caminhos e as requisições dinâmicas; abrir os arquivos diretamente pode bloquear algumas consultas do navegador.
