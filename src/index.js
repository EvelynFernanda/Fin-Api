const express = require("express");
const { v4: uuid } = require("uuid");

const app = express();

app.use(express.json());

const customers = [];

//Middleware
const verifyExistsAccountCPF = (request, response, next) => {
  const { cpf } = request.headers;

  const customer = customers.find((customer) => customer.cpf === cpf);
  if (!customer) {
    return response.status(400).json({ error: "Customer not found" });
  }

  request.customer = customer;

  return next();
};
const getBalance = (statement) => {
  const balance = statement.reduce((acc, operation) => {
    if (operation.type === "credit") {
      return acc + operation.amount;
    } else {
      return acc - operation.amount;
    }
  }, 0);
  return balance;
};

//Cria conta do cliente
app.post("/account", (request, response) => {
  const { cpf, name } = request.body;
  const customerAlreadyExists = customers.some(
    (customer) => customer.cpf === cpf
  );
  if (customerAlreadyExists) {
    return response.status(400).json({ error: "Customer already exists!" });
  }

  customers.push({
    cpf,
    name,
    id: uuid(),
    statement: [],
  });
  return response.status(200).send();
});

//Atualiza dados do cliente
app.put("/account", verifyExistsAccountCPF, (request, response) => {
  const { name } = request.body;
  const { customer } = request;

  customer.name = name;
  return response.status(200).send();
});

//Ver dados da conta
app.get("/account", verifyExistsAccountCPF, (request, response) => {
  const { customer } = request;
  return response.json(customer);
});

//Delete conta
app.delete("/account", verifyExistsAccountCPF, (request, response) => {
  const { customer } = request;

  customers.splice(customer, 1);

  return response.status(200).json(customers);
});

//Busca o extrato de transações do cliente
app.get("/statement", verifyExistsAccountCPF, (request, response) => {
  const { customer } = request;
  return response.json(customer.statement);
});

//Busca extrato de transações por data
app.get("/statement/date", verifyExistsAccountCPF, (request, response) => {
  const { customer } = request;
  const { date } = request.query;

  const dateFormat = new Date(date + " 00:00");

  const statement = customer.statement.filter((statement) => {
    statement.created_at.toDateString() === new Date(dateFormat).toDateString();
  });

  return response.json(statement);
});

//Realiza deposito
app.post("/deposit", verifyExistsAccountCPF, (request, response) => {
  const { description, amount } = request.body;
  const { customer } = request;

  const statementOperation = {
    description,
    amount,
    created_at: new Date(),
    type: "credit",
  };
  customer.statement.push(statementOperation);
  return response.status(201).send();
});

//Realiza saque
app.post("/withdraw", verifyExistsAccountCPF, (request, response) => {
  const { amount } = request.body;
  const { customer } = request;

  const balance = getBalance(customer.statement);

  if (balance < amount) {
    return response.status(400).json({ error: "Insufficient funds!" });
  }
  const statementOperation = {
    amount,
    created_at: new Date(),
    type: "debit",
  };
  customer.statement.push(statementOperation);

  return response.status(201).send();
});

//balance
app.get("/balance", verifyExistsAccountCPF, (request, response) => {
  const { customer } = request;

  const balance = getBalance(customer.statement);
  return response.json(balance);
});

app.listen(3333);
