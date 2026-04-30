# Balaio Design System

## Direcao

Balaio e um app web/PWA minimalista para feira mensal compartilhada em tempo real.

Personalidade:

- simples
- rapido
- claro
- brasileiro sem folclore
- util antes de bonito
- visual quente, firme e sem firula

Referencia visual:

- clareza de app de produtividade
- ritmo de Notion
- cores solidas
- poucos elementos decorativos
- foco em lista, total, orcamento e colaboracao

## Principios

- Interface deve parecer leve e imediata.
- Precos, totais e status devem ser mais legiveis que qualquer elemento de marca.
- Cores de feedback devem ser consistentes em todo o app.
- Logo pode ser organica; UI deve ser precisa.
- Evitar excesso de cards. Usar linhas, divisores e espaco.
- Animacoes curtas, discretas e funcionais.
- Nada de gradientes chamativos, sombras pesadas ou decoracao solta.

## Paleta - Tema Claro

| Uso | Cor | Hex |
| --- | --- | --- |
| Fundo principal | Off-white quente | `#FAF9F6` |
| Superficie / cards | Bege claro | `#F2F1EE` |
| Linha / borda sutil | Cinza quente claro | `#E5E1D8` |
| Texto principal | Verde quase preto | `#14261F` |
| Texto secundario | Cinza oliva | `#6B6F68` |
| Primaria / marca | Verde feira | `#166534` |
| Primaria hover | Verde escuro | `#0F4D2A` |
| Secundaria | Verde folha | `#4CAF6A` |
| Acao positiva / comprado | Verde vivo | `#22C55E` |
| Alerta / orcamento estourado | Laranja tomate | `#E64D2E` |
| Orcamento / destaque | Amarelo feira | `#F2B705` |
| Branco interno da logo | Branco quente | `#FFFDF7` |

## Paleta - Tema Escuro

| Uso | Cor | Hex |
| --- | --- | --- |
| Fundo principal absoluto | Preto absoluto | `#000000` |
| Superficie principal | Preto suave | `#0B0D0C` |
| Cards / areas elevadas | Grafite verde | `#101613` |
| Cards hover | Verde quase preto | `#13241A` |
| Linha / borda sutil | Verde acinzentado escuro | `#26352D` |
| Texto principal | Branco quente | `#F8F6EF` |
| Texto secundario | Cinza quente | `#A8A69F` |
| Texto terciario | Cinza oliva | `#6F746C` |
| Primaria / marca | Verde feira | `#22A55A` |
| Primaria hover | Verde vivo escuro | `#168246` |
| Acao positiva / comprado | Verde vivo | `#22C55E` |
| Alerta / orcamento estourado | Laranja tomate | `#F15A32` |
| Orcamento / aviso | Amarelo feira | `#F2B705` |
| Icones neutros | Cinza claro | `#D8D5CC` |

## Paleta - Logo

| Elemento | Cor | Hex |
| --- | --- | --- |
| Traco principal da cesta | Verde escuro | `#0B3F25` |
| Folhas | Verde folha | `#6EAE3F` |
| Fruta laranja | Laranja tomate | `#E95A24` |
| Fruta amarela | Amarelo fruta | `#F4B72E` |
| Brilhos / respiros | Branco quente | `#FFFDF7` |

## Tokens CSS

```css
:root {
  --color-bg: #FAF9F6;
  --color-surface: #F2F1EE;
  --color-border: #E5E1D8;
  --color-text: #14261F;
  --color-text-muted: #6B6F68;
  --color-primary: #166534;
  --color-primary-hover: #0F4D2A;
  --color-secondary: #4CAF6A;
  --color-success: #22C55E;
  --color-danger: #E64D2E;
  --color-warning: #F2B705;
  --color-logo-white: #FFFDF7;
}

[data-theme="dark"] {
  --color-bg: #000000;
  --color-surface: #0B0D0C;
  --color-elevated: #101613;
  --color-elevated-hover: #13241A;
  --color-border: #26352D;
  --color-text: #F8F6EF;
  --color-text-muted: #A8A69F;
  --color-text-tertiary: #6F746C;
  --color-primary: #22A55A;
  --color-primary-hover: #168246;
  --color-success: #22C55E;
  --color-danger: #F15A32;
  --color-warning: #F2B705;
  --color-icon: #D8D5CC;
}
```

## Tipografia

Recomendacao final:

| Uso | Fonte | Regra |
| --- | --- | --- |
| Marca / logo | Caveat Brush | usar apenas em marca, splash e materiais |
| Destaques editoriais raros | Caveat | usar pouco, nunca em tabela/lista densa |
| Interface | Inter | padrao para app inteiro |
| Numeros | Inter | pesos 500/600, alinhamento tabular |

Evitar:

- Patrick Hand na UI principal
- fonte manual em preco, total, tabela ou botao
- muitos textos com Caveat na tela

CSS:

```css
:root {
  --font-brand: "Caveat Brush", cursive;
  --font-display: "Caveat", cursive;
  --font-ui: "Inter", system-ui, sans-serif;
}

body,
button,
input,
select,
textarea,
table {
  font-family: var(--font-ui);
}

.brand-wordmark {
  font-family: var(--font-brand);
  letter-spacing: 0;
}

.price,
.total,
.budget {
  font-variant-numeric: tabular-nums;
}
```

Pesos:

| Fonte | Pesos |
| --- | --- |
| Caveat Brush | 400 |
| Caveat | 600, 700 |
| Inter | 400, 500, 600, 700 |

## Logo

Direcao:

- cesta desenhada a mao
- traco verde escuro
- frutas simples
- forma reconhecivel em tamanho pequeno
- versao com icone isolado
- versao horizontal com wordmark Balaio

Cuidados:

- simplificar detalhes internos para favicon
- evitar sombra na versao principal
- manter fundo transparente
- criar versoes para fundo claro e escuro

## Iconografia

Estilo:

- linear
- cantos arredondados
- stroke entre 1.75 e 2
- sem preenchimentos pesados
- tamanho base 20px na UI
- tamanho 24px para botoes principais
- consistente com Lucide Icons

Icones necessarios:

- adicionar item
- editar
- excluir
- comprado
- compartilhar
- calendario
- orcamento
- total
- usuario
- perfil
- configuracoes
- voltar
- mais opcoes
- arrastar/reordenar
- convite
- online
- editando
- visualizando

## Componentes

### Botao Primario

- fundo `--color-primary`
- hover `--color-primary-hover`
- texto branco quente
- altura 36px desktop
- altura 40px mobile
- raio 8px
- icone a esquerda quando houver acao clara

### Botao Secundario

- fundo transparente ou superficie
- borda sutil
- texto principal
- usado para compartilhar, filtros e acoes secundarias

### Lista de Feiras

Cada linha deve mostrar:

- mes e ano
- numero de pessoas
- orcamento
- total atual
- barra de progresso
- status se passou do orcamento

Preferir linha com divisores, nao card pesado.

### Feira Aberta

Desktop:

- tabela/lista principal
- colunas: item, qtd, preco, total, status
- acoes discretas por linha
- resumo fixo inferior ou lateral

Mobile:

- linhas compactas
- preco e total visiveis
- acao de comprado com toque facil
- botao adicionar sempre acessivel

### Orcamento

Estados:

- dentro do orcamento: verde
- perto do limite: amarelo
- estourado: laranja tomate

Mostrar:

- orcamento
- total
- restante
- percentual usado

### Colaboracao Realtime

Indicadores:

- avatar pequeno
- ponto online
- status editando
- status salvo
- ultima mudanca discreta

Eventos visuais:

- item alterado: highlight rapido na linha
- item comprado: transicao para estado concluido
- usuario editando item: pequeno marcador na linha

## Espacamento E Forma

Tokens:

```css
:root {
  --radius-sm: 6px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
}
```

Regras:

- cards ate 8px quando forem densos
- 12px apenas para paineis maiores
- evitar nested cards
- divisores de 1px para listas
- sombras quase invisiveis

## Motion

Usar pouco:

- hover: 120ms a 180ms
- update realtime: highlight 700ms
- comprado: check + opacidade leve
- loading: skeleton, sem spinner central

Evitar:

- animacao continua
- bouncing excessivo
- transicoes longas
- efeitos decorativos

## Assets Necessarios

### Fontes

| Arquivo | Formato | Observacao |
| --- | --- | --- |
| `caveat-brush-regular.woff2` | WOFF2 | marca |
| `caveat-600.woff2` | WOFF2 | opcional |
| `caveat-700.woff2` | WOFF2 | opcional |
| `inter-400.woff2` | WOFF2 | UI |
| `inter-500.woff2` | WOFF2 | UI |
| `inter-600.woff2` | WOFF2 | UI |
| `inter-700.woff2` | WOFF2 | UI |

### Logo Vetorial

| Arquivo | Formato | Uso |
| --- | --- | --- |
| `balaio-logo-horizontal.svg` | SVG | header, login, materiais |
| `balaio-logo-horizontal-dark.svg` | SVG | fundo escuro |
| `balaio-symbol.svg` | SVG | icone isolado |
| `balaio-symbol-dark.svg` | SVG | icone isolado em fundo escuro |
| `balaio-wordmark.svg` | SVG | texto Balaio isolado |
| `balaio-wordmark-dark.svg` | SVG | texto Balaio para fundo escuro |
| `balaio-symbol-mono.svg` | SVG | uma cor, favicon/marcacao |

SVG deve vir com:

- fundo transparente
- paths expandidos quando possivel
- viewBox quadrado para simbolo
- viewBox justo para wordmark/horizontal
- sem filtros, sombras ou raster embutido

### PWA E App Icons

| Arquivo | Tamanho | Formato | Uso |
| --- | --- | --- | --- |
| `favicon.ico` | 16, 32, 48 | ICO | navegador |
| `favicon-16x16.png` | 16x16 | PNG | fallback |
| `favicon-32x32.png` | 32x32 | PNG | fallback |
| `apple-touch-icon.png` | 180x180 | PNG | iOS |
| `pwa-192x192.png` | 192x192 | PNG | PWA |
| `pwa-512x512.png` | 512x512 | PNG | PWA |
| `maskable-192x192.png` | 192x192 | PNG | Android maskable |
| `maskable-512x512.png` | 512x512 | PNG | Android maskable |
| `app-icon-1024.png` | 1024x1024 | PNG | fonte para stores/export |

Regras para maskable:

- simbolo centralizado
- margem segura minima 20%
- fundo solido `#166534` ou `#FAF9F6`
- sem detalhes finos nas bordas

### Logo PNG

| Arquivo | Tamanho | Formato | Uso |
| --- | --- | --- | --- |
| `balaio-logo-horizontal@1x.png` | largura 320 | PNG transparente | fallback |
| `balaio-logo-horizontal@2x.png` | largura 640 | PNG transparente | telas retina |
| `balaio-symbol@1x.png` | 128x128 | PNG transparente | UI |
| `balaio-symbol@2x.png` | 256x256 | PNG transparente | UI retina |
| `balaio-symbol@4x.png` | 512x512 | PNG transparente | export |

### Open Graph

| Arquivo | Tamanho | Formato | Uso |
| --- | --- | --- | --- |
| `og-image.png` | 1200x630 | PNG/JPG | compartilhamento |
| `twitter-image.png` | 1200x675 | PNG/JPG | redes |

Conteudo sugerido:

- fundo claro
- logo horizontal
- mockup simples da lista
- texto curto: "Sua feira, em ordem."

## Estrutura Recomendada De Pastas

```txt
Design/
  DESIGN_SYSTEM.md
  design.png
  logo.png
  assets/
    logo/
      balaio-logo-horizontal.svg
      balaio-logo-horizontal-dark.svg
      balaio-symbol.svg
      balaio-symbol-dark.svg
      balaio-wordmark.svg
      balaio-wordmark-dark.svg
      balaio-symbol-mono.svg
    icons/
    pwa/
      favicon.ico
      favicon-16x16.png
      favicon-32x32.png
      apple-touch-icon.png
      pwa-192x192.png
      pwa-512x512.png
      maskable-192x192.png
      maskable-512x512.png
      app-icon-1024.png
    social/
      og-image.png
      twitter-image.png
    fonts/
```

## Decisoes Abertas

- Confirmar se app tera tema escuro no MVP.
- Definir se wordmark sera texto real com fonte ou SVG fechado.
- Criar versao simplificada da logo para favicon.
- Confirmar biblioteca de icones no app: Lucide recomendada.
- Confirmar se `Inter` sera carregada localmente ou via provedor externo.
