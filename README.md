# Stop English. Banco de palavras

Página estática em HTML, CSS e JavaScript para consultar o banco de palavras usado no jogo Stop.

## Como executar

1. Extraia todos os arquivos para uma mesma pasta.
2. Abra `index.html` em um navegador atualizado.
3. Aguarde os 30 segundos iniciais.
4. Escolha uma letra e depois uma categoria.

Não é necessário instalar dependências, usar Node.js ou iniciar um servidor local.

## Arquivos

- `index.html`: estrutura da página.
- `styles.css`: aparência e layout responsivo.
- `app.js`: temporizadores, navegação e lógica do jogo.
- `word-bank.js`: banco com as 1.007 entradas extraídas da aba `Todas as palavras` da planilha original.

## Regras implementadas

- A página libera o alfabeto após 30 segundos.
- O alfabeto contém as letras A-P e R-V. Q, W, X, Y e Z não aparecem.
- Ao selecionar uma letra, aparecem as 12 categorias e a quantidade de palavras cadastradas em cada uma.
- A primeira categoria selecionada revela as palavras imediatamente.
- Cada revelação concluída acrescenta 2 segundos à espera da próxima seleção: 0 s, 2 s, 4 s, 6 s e assim por diante.
- O botão `Trocar letra` retorna ao alfabeto sem recarregar a página. A contagem acumulada de revelações é mantida durante a sessão.
- Se uma espera for cancelada antes de terminar, ela não é contada como uma revelação concluída.

## Alterar o tempo

No início de `app.js`, altere estas constantes:

```js
const INITIAL_WAIT_SECONDS = 30;
const EXTRA_WAIT_PER_REVEAL_SECONDS = 2;
```

O banco de palavras está em `word-bank.js`. Para atualizar as palavras, mantenha a estrutura dos objetos: `category`, `letter`, `word` e `meaning`.
