# BUGS.md

## Backend NestJS

---

### B1 — Payloads inválidos aceitos sem erro de validação

**Localização:** `backend-nest/src/main.ts`

**Como reproduzir:**
1. Subir o backend
2. Fazer POST em `/v1/auth/login` com body `{ "email": "nao-e-um-email", "senha": "" }`
3. Resultado: requisição processada sem erro de validação

**Descrição:**
Os DTOs possuem decorators de validação (`@IsEmail`, `@IsNotEmpty`, `@IsEnum`, `@Matches`, etc.)
do `class-validator`, mas o `ValidationPipe` global nunca foi registrado no `main.ts`.
O NestJS ignora todos os decorators de validação sem o pipe configurado.

**Impacto:** Qualquer payload inválido era aceito silenciosamente, incluindo
e-mails malformados, campos obrigatórios vazios e valores fora do enum.

**Solução:** Registrado o `ValidationPipe` global no `main.ts`.

**Antes:**
```typescript
app.enableCors({ origin: 'http://localhost:3000' });
app.enableVersioning({ type: VersioningType.URI });
```

**Depois:**
```typescript
import { ValidationPipe } from '@nestjs/common';

app.enableCors({ origin: 'http://localhost:3000' });
app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }));
app.enableVersioning({ type: VersioningType.URI });
```

---

### B2 — Login sempre retorna 401 mesmo com credenciais corretas

**Localização:** `backend-nest/src/auth/aplicacao/controller/Auth.controller.ts`, linha 17

**Como reproduzir:**
1. Fazer POST em `/v1/auth/login` com `admin@consultaveicular.com` / `admin123`
2. Resultado: erro 401

**Descrição:**
A rota `/auth/login` estava decorada com `@UseGuards(JwtAuthGuard)`, exigindo
um token JWT válido para acessá-la. Como essa é a rota responsável por gerar
o token, nenhum usuário conseguia autenticar — dependência circular impossível.

**Impacto:** Bloqueio total do sistema. Nenhuma funcionalidade era acessível.

**Solução:** Removido o `@UseGuards(JwtAuthGuard)` da rota de login.

**Antes:**
```typescript
@UseGuards(JwtAuthGuard)
@Post('login')
async login(@Body() dto: LoginDto): Promise<TokenAuthQuery> {
```

**Depois:**
```typescript
@Post('login')
async login(@Body() dto: LoginDto): Promise<TokenAuthQuery> {
```

---

### B3 — Endpoint de débitos por placa sempre retorna lista vazia

**Localização:** `backend-nest/src/debito/aplicacao/service/Debito.service.ts`, linha 36

**Como reproduzir:**
1. Autenticar e fazer GET em `/v1/debitos/veiculo/ABC1234`
2. Resultado: `[]`

**Descrição:**
Faltava `await` na chamada `buscarPorPlaca`. Sem o await, a variável `veiculo`
recebia uma `Promise` — que é sempre truthy — nunca lançando o 404.
Porém `(veiculo as any).id` retornava `undefined`, fazendo a query
buscar `veiculoId = undefined` e retornar lista vazia.

**Impacto:** Impossível consultar débitos de qualquer veículo.

**Solução:** Adicionado `await`.

**Antes:**
```typescript
const veiculo = this.veiculoRepository.buscarPorPlaca(placa.toUpperCase());
```

**Depois:**
```typescript
const veiculo = await this.veiculoRepository.buscarPorPlaca(placa.toUpperCase());
```

---

### B4 — Valores calculados dos débitos incorretos

**Localização:** `backend-nest/src/debito/aplicacao/service/Debito.service.ts`, linha 20

**Como reproduzir:**
1. Buscar débitos de ABC1234 (IPVA com valor ~810, multa 10%, juros 5%)
2. Resultado: juros calculado sobre `valor + multa` em vez do valor base

**Descrição:**
Os juros eram calculados sobre `valorComMulta` (valor já acrescido de multa)
em vez do valor original. Multa e juros são encargos independentes e ambos
devem incidir sobre o valor base.

**Impacto:** Valores cobrados a mais dos usuários — erro financeiro direto.

**Solução:** Juros e multa calculados de forma independente sobre o valor base.

**Antes:**
```typescript
const valorComMulta = debito.valor + valorMulta;
const valorJuros = valorComMulta * (debito.percentualJuros / 100);
return { ...debito, valorMulta, valorJuros, valorTotal: valorComMulta + valorJuros };
```

**Depois:**
```typescript
const valorMulta = debito.valor * (debito.percentualMulta / 100);
const valorJuros = debito.valor * (debito.percentualJuros / 100);
return { ...debito, valorMulta, valorJuros, valorTotal: debito.valor + valorMulta + valorJuros };
```

---

### B5 — Status HTTP de criação de veículo retornando 200 em vez de 201

**Localização:** `backend-nest/src/veiculo/aplicacao/controller/Veiculo.controller.ts`, linha 43

**Como reproduzir:**
1. Fazer POST em `/v1/veiculos` com dados válidos
2. Resultado: status 200

**Descrição:**
O decorator `@HttpCode(200)` forçava o retorno 200 em um endpoint de criação
de recurso. Por convenção REST e pela própria anotação `@ApiCreatedResponse`,
criação de recurso deve retornar 201.

**Impacto:** Comportamento não-REST, conflito com a documentação Swagger.

**Solução:** Removido o `@HttpCode(200)`. NestJS retorna 201 por padrão em `@Post`.

---

### B6 — Filtro por status e tipo de débito sem efeito

**Localização:** `backend-nest/src/debito/infra/repository/Debito.repository.ts`, linhas 19-22

**Como reproduzir:**
1. Fazer GET em `/v1/debitos/veiculo/ABC1234?status=PAGO`
2. Resultado: retorna todos os débitos ignorando o filtro

**Descrição:**
O filtro por `tipo` estava comentado intencionalmente no código.
O filtro por `status` nem havia sido implementado.

**Impacto:** Usuário não conseguia filtrar débitos por status ou tipo.

**Solução:** Descomentado o filtro de `tipo` e implementado o filtro de `status`.

**Antes:**
```typescript
if (command.tipo) {
  // query.andWhere('d.tipo = :tipo', { tipo: command.tipo });
}
```

**Depois:**
```typescript
if (command.tipo) {
  query.andWhere('d.tipo = :tipo', { tipo: command.tipo });
}
if (command.status) {
  query.andWhere('d.status = :status', { status: command.status });
}
```

---

## Frontend

---

### BF1 — Interface DebitoCalculado com nomes de campos em snake_case

**Localização:** `frontend/src/lib/api.ts`

**Como reproduzir:**
1. Acessar a tela de detalhes de qualquer veículo
2. Resultado: valores monetários exibidos como `R$ 0,00` ou `undefined`

**Descrição:**
A interface `DebitoCalculado` definia os campos em `snake_case`
(`valor_total`, `valor_multa`, `valor_juros`, `criado_em`, `veiculo_id`)
mas o backend NestJS retorna os campos em `camelCase`
(`valorTotal`, `valorMulta`, `valorJuros`, `criadoEm`, `veiculoId`).
Todos os valores chegavam como `undefined` no frontend.

**Impacto:** Valores monetários incorretos em toda a tela de detalhes do veículo.

**Solução:** Corrigidos os nomes dos campos para `camelCase` na interface.

**Antes:**
```typescript
export interface DebitoCalculado {
  veiculo_id: number;
  multa_percentual: number;
  juros_percentual: number;
  valor_multa: number;
  valor_juros: number;
  valor_total: number;
  criado_em: string;
}
```

**Depois:**
```typescript
export interface DebitoCalculado {
  veiculoId: number;
  percentualMulta: number;
  percentualJuros: number;
  valorMulta: number;
  valorJuros: number;
  valorTotal: number;
  criadoEm: string;
}
```

---

### BF2 — Total em aberto exibindo "R$ NaN"

**Localização:** `frontend/src/app/veiculo/[placa]/page.tsx`, linha 44

**Como reproduzir:**
1. Acessar a tela de detalhes de qualquer veículo
2. Resultado: "Total em aberto" exibe `R$ NaN`

**Descrição:**
Consequência direta do BF1. O `reduce` somava `d.valor_total`
que chegava como `undefined`, resultando em `NaN` ao tentar
formatar como moeda.

**Impacto:** Valor total em aberto incorreto para o usuário.

**Solução:** Corrigido o campo para `d.valorTotal`.

**Antes:**
```typescript
const valorTotal = debitosPendentes.reduce((acc, d) => acc + d.valor_total, 0);
```

**Depois:**
```typescript
const valorTotal = debitosPendentes.reduce((acc, d) => acc + d.valorTotal, 0);
```

---

### BF3 — VeiculoCard tratava array de débitos como resposta paginada

**Localização:** `frontend/src/components/VeiculoCard.tsx`, linha 21

**Como reproduzir:**
1. Acessar a listagem de veículos
2. Resultado: contador de débitos sempre mostra 0 ou valor incorreto

**Descrição:**
O endpoint `GET /debitos/veiculo/:placa` retorna `DebitoCalculado[]`
diretamente, mas o componente tipava a resposta como
`RespostaPaginada<DebitoCalculado>` e usava um cast forçado
`as unknown as DebitoCalculado[]` para tentar corrigir — frágil e incorreto.

**Impacto:** Contagem de débitos pendentes incorreta nos cards da listagem.

**Solução:** Corrigido o tipo da requisição para `DebitoCalculado[]`
e removido o cast desnecessário.

**Antes:**
```typescript
api.get<RespostaPaginada>(`${API_PREFIX}/debitos/veiculo/${veiculo.placa}`)
  .then(({ data }) => {
    const pendentes = (data as unknown as DebitoCalculado[]).filter(...)
```

**Depois:**
```typescript
api.get(`${API_PREFIX}/debitos/veiculo/${veiculo.placa}`)
  .then(({ data }) => {
    const pendentes = data.filter(...)
```

### BF4 — Botão "Quitar" sempre retornava erro por falta de import

**Localização:** `frontend/src/components/DebitosList.tsx`

**Como reproduzir:**
1. Acessar a tela de detalhes de um veículo
2. Clicar no botão "Quitar" em qualquer débito
3. Resultado: mensagem "Erro ao quitar débito" mesmo com o backend funcionando

**Descrição:**
O arquivo `DebitosList.tsx` usava `api` e `API_PREFIX` na função
`handleQuitar` mas não os importava. O TypeScript não apontou erro
em tempo de compilação pois o `noImplicitAny` estava desabilitado
no `tsconfig.json`, deixando o bug silencioso.

**Impacto:** Impossível quitar qualquer débito pela interface.

**Solução:** Adicionado o import correto no topo do arquivo.

**Antes:**
```typescript
import { DebitoCalculado } from '@/lib/api';
```

**Depois:**
```typescript
import api, { DebitoCalculado, API_PREFIX } from '@/lib/api';
```