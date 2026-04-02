import initSqlJs, { Database } from 'sql.js';
import * as fs from 'fs';
import * as path from 'path';
import bcrypt from 'bcryptjs';

const dbPath = path.resolve(process.env.DB_PATH || './database.sqlite');
let db: Database = null as unknown as Database;

function salvarDb(): void {
  const data = db.export();
  fs.writeFileSync(dbPath, Buffer.from(data));
}

function getSync<T>(sql: string, params: unknown[] = []): T | undefined {
  const stmt = db.prepare(sql);
  stmt.bind(params as any[]);
  const result = stmt.step() ? (stmt.getAsObject() as T) : undefined;
  stmt.free();
  return result;
}

export async function inicializarBanco(): Promise<void> {
  const SQL = await initSqlJs();

  if (fs.existsSync(dbPath)) {
    db = new SQL.Database(fs.readFileSync(dbPath));
  } else {
    db = new SQL.Database();
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      senha_hash TEXT NOT NULL,
      criado_em TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS veiculos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      placa TEXT UNIQUE NOT NULL,
      renavam TEXT UNIQUE NOT NULL,
      proprietario TEXT NOT NULL,
      modelo TEXT NOT NULL,
      ano INTEGER NOT NULL,
      cor TEXT NOT NULL,
      criado_em TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS debitos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      veiculo_id INTEGER NOT NULL,
      tipo TEXT NOT NULL,
      descricao TEXT NOT NULL,
      valor REAL NOT NULL,
      multa_percentual REAL NOT NULL DEFAULT 0,
      juros_percentual REAL NOT NULL DEFAULT 0,
      vencimento TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'PENDENTE',
      criado_em TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (veiculo_id) REFERENCES veiculos(id)
    );
  `);

  const jaExiste = getSync<{ id: number }>('SELECT id FROM usuarios WHERE email = ?', ['admin@consultaveicular.com']);
  if (jaExiste) return;

  const senhaHash = bcrypt.hashSync('admin123', 10);
  db.run('INSERT INTO usuarios (nome, email, senha_hash) VALUES (?, ?, ?)', [
    'Administrador', 'admin@consultaveicular.com', senhaHash,
  ]);

  const veiculos = [
    { placa: 'ABC1234', renavam: '12345678901', proprietario: 'João da Silva', modelo: 'Fiat Uno', ano: 2019, cor: 'Branco' },
    { placa: 'DEF5678', renavam: '23456789012', proprietario: 'Maria Oliveira', modelo: 'Honda Civic', ano: 2021, cor: 'Prata' },
    { placa: 'GHI9012', renavam: '34567890123', proprietario: 'Carlos Santos', modelo: 'VW Gol', ano: 2018, cor: 'Preto' },
    { placa: 'JKL3E45', renavam: '45678901234', proprietario: 'Ana Costa', modelo: 'Hyundai HB20', ano: 2022, cor: 'Azul' },
    { placa: 'MNO6F78', renavam: '56789012345', proprietario: 'Pedro Souza', modelo: 'Toyota Corolla', ano: 2020, cor: 'Vermelho' },
    { placa: 'PQR9G01', renavam: '67890123456', proprietario: 'Fernanda Lima', modelo: 'Renault Kwid', ano: 2023, cor: 'Laranja' },
    { placa: 'STU2H34', renavam: '78901234567', proprietario: 'Roberto Alves', modelo: 'Chevrolet Onix', ano: 2021, cor: 'Branco' },
    { placa: 'VWX5I67', renavam: '89012345678', proprietario: 'Juliana Martins', modelo: 'Ford Fiesta', ano: 2019, cor: 'Prata' },
  ];

  for (const v of veiculos) {
    db.run('INSERT INTO veiculos (placa, renavam, proprietario, modelo, ano, cor) VALUES (?, ?, ?, ?, ?, ?)', [
      v.placa, v.renavam, v.proprietario, v.modelo, v.ano, v.cor,
    ]);
    const id = db.exec('SELECT last_insert_rowid() as id')[0].values[0][0] as number;

    db.run('INSERT INTO debitos (veiculo_id, tipo, descricao, valor, multa_percentual, juros_percentual, vencimento, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [
      id, 'IPVA', `IPVA ${v.ano} - ${v.modelo}`, 800 + Math.random() * 400, 10, 5, '2024-03-31', 'PENDENTE',
    ]);
    db.run('INSERT INTO debitos (veiculo_id, tipo, descricao, valor, multa_percentual, juros_percentual, vencimento, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [
      id, 'LICENCIAMENTO', `Licenciamento ${v.ano}`, 89.50, 0, 0, '2024-06-30', Math.random() > 0.5 ? 'PAGO' : 'PENDENTE',
    ]);
    if (Math.random() > 0.4) {
      db.run('INSERT INTO debitos (veiculo_id, tipo, descricao, valor, multa_percentual, juros_percentual, vencimento, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [
        id, 'MULTA', 'Auto de infração - Excesso de velocidade', 293.47, 10, 1, '2024-01-15', 'VENCIDO',
      ]);
    }
  }

  salvarDb();
}

export function queryAsync<T>(sql: string, params: unknown[] = []): Promise<T[]> {
  return new Promise((resolve, reject) => {
    setImmediate(() => {
      try {
        const stmt = db.prepare(sql);
        stmt.bind(params as any[]);
        const results: T[] = [];
        while (stmt.step()) {
          results.push(stmt.getAsObject() as T);
        }
        stmt.free();
        resolve(results);
      } catch (err) {
        reject(err);
      }
    });
  });
}

export function getAsync<T>(sql: string, params: unknown[] = []): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    setImmediate(() => {
      try {
        const stmt = db.prepare(sql);
        stmt.bind(params as any[]);
        const result = stmt.step() ? (stmt.getAsObject() as T) : undefined;
        stmt.free();
        resolve(result);
      } catch (err) {
        reject(err);
      }
    });
  });
}

export function runAsync(sql: string, params: unknown[] = []): Promise<{ lastInsertRowid: number; changes: number }> {
  return new Promise((resolve, reject) => {
    setImmediate(() => {
      try {
        db.run(sql, params as any[]);
        const lastInsertRowid = db.exec('SELECT last_insert_rowid() as id')[0]?.values[0][0] as number ?? 0;
        salvarDb();
        resolve({ lastInsertRowid, changes: 1 });
      } catch (err) {
        reject(err);
      }
    });
  });
}

export default db;
