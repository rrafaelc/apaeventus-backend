/* eslint-disable */
// Script para gerar usuários de teste com CPFs válidos
const fs = require('fs');
const path = require('path');

// Função para gerar CPF válido
function generateValidCPF() {
  // Gera os 9 primeiros dígitos aleatoriamente
  const randomDigits = Array.from({ length: 9 }, () =>
    Math.floor(Math.random() * 10),
  );

  // Calcula o primeiro dígito verificador
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += randomDigits[i] * (10 - i);
  }
  let firstDigit = 11 - (sum % 11);
  if (firstDigit >= 10) firstDigit = 0;

  // Calcula o segundo dígito verificador
  sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += randomDigits[i] * (11 - i);
  }
  sum += firstDigit * 2;
  let secondDigit = 11 - (sum % 11);
  if (secondDigit >= 10) secondDigit = 0;

  // Monta o CPF completo
  return [...randomDigits, firstDigit, secondDigit].join('');
}

// Função para gerar telefone celular válido
function generatePhone() {
  const ddd = Math.floor(Math.random() * 89) + 11; // DDD entre 11 e 99
  const number = Math.floor(Math.random() * 90000000) + 910000000; // 9XXXX-XXXX
  return `${ddd}${number}`;
}

// Função para gerar RG
function generateRG() {
  const digits = Math.floor(Math.random() * 100000000); // 8 dígitos
  const checkDigit = Math.random() < 0.5 ? Math.floor(Math.random() * 10) : 'X';
  return `${digits}-${checkDigit}`;
}

// Lista de nomes para randomizar
const firstNames = [
  'Ana',
  'Bruno',
  'Carlos',
  'Daniel',
  'Eduardo',
  'Fernanda',
  'Gabriel',
  'Helena',
  'Igor',
  'Julia',
  'Lucas',
  'Maria',
  'Nicolas',
  'Olivia',
  'Pedro',
  'Rafaela',
  'Samuel',
  'Tatiana',
  'Vitor',
  'Wesley',
  'Yasmin',
  'Zoe',
  'Amanda',
  'Beatriz',
  'Caio',
  'Diego',
  'Elisa',
  'Felipe',
  'Giovana',
  'Henrique',
  'Isabella',
  'Joao',
  'Larissa',
  'Mateus',
  'Natalia',
  'Otavio',
  'Patricia',
  'Rodrigo',
  'Sofia',
  'Thiago',
];

const lastNames = [
  'Silva',
  'Santos',
  'Oliveira',
  'Souza',
  'Costa',
  'Pereira',
  'Ferreira',
  'Rodrigues',
  'Almeida',
  'Nascimento',
  'Lima',
  'Araujo',
  'Fernandes',
  'Carvalho',
  'Gomes',
  'Martins',
  'Rocha',
  'Ribeiro',
  'Alves',
  'Monteiro',
  'Mendes',
  'Barros',
  'Freitas',
  'Barbosa',
  'Pinto',
  'Moura',
  'Cavalcanti',
  'Dias',
  'Castro',
  'Campos',
  'Cardoso',
  'Machado',
];

// Gera usuários
const users = [];
const usedCPFs = new Set();

console.log('Gerando 1000 usuários com CPFs válidos...\n');

for (let i = 0; i < 1000; i++) {
  let cpf;

  // Garante CPF único
  do {
    cpf = generateValidCPF();
  } while (usedCPFs.has(cpf));
  usedCPFs.add(cpf);

  const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
  const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
  const name = `${firstName} ${lastName}`;

  // Email sequencial garantido único
  const email = `teste${i + 1}@teste.com`;

  const user = {
    name,
    email,
    password: 'Teste123!',
    cpf,
    rg: generateRG(),
    cellphone: generatePhone(),
  };

  users.push(user);

  if ((i + 1) % 100 === 0) {
    console.log(`Gerados ${i + 1} usuários...`);
  }
}

// Salva em JSON
const jsonPath = path.join(__dirname, 'test-users.json');
fs.writeFileSync(jsonPath, JSON.stringify(users, null, 2), 'utf8');
console.log(`\n✅ JSON salvo: ${jsonPath}`);

// Salva em CSV para JMeter
const csvPath = path.join(__dirname, 'test-users.csv');
const csvHeader = 'name,email,password,cpf,rg,cellphone\n';
const csvRows = users
  .map(
    (u) =>
      `"${u.name}","${u.email}","${u.password}","${u.cpf}","${u.rg}","${u.cellphone}"`,
  )
  .join('\n');

fs.writeFileSync(csvPath, csvHeader + csvRows, 'utf8');
console.log(`✅ CSV salvo: ${csvPath}`);

console.log(`\n📊 Total: ${users.length} usuários gerados`);
console.log('\n💡 Uso no JMeter:');
console.log('   1. Adicione "CSV Data Set Config"');
console.log('   2. Filename: test-users.csv');
console.log('   3. Variable Names: name,email,password,cpf,rg,cellphone');
console.log('   4. Use as variáveis: ${name}, ${email}, ${password}, etc.\n');
