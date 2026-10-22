
const express = require("express");
const mongoose = require("mongoose");
const Transaction = require("../models/Transaction");

const router = express.Router();

// GET all transactions, optionally filtered by type and category
router.get("/", async (req, res) => {
  try {
    const filter = {};
    const { type, category } = req.query;

    if (type && ["income", "expense"].includes(type)) {
      filter.type = type;
    }

    if (category) {
      filter.category = category;
    }

    const transactions = await Transaction.find(filter).sort({
      date: -1,
      createdAt: -1,
    });

    res.json(transactions);
  } catch (error) {
    console.error("Fetch transactions:", error);
    res.status(500).json({ message: "Could not fetch transactions" });
  }
});

// GET summary calculated from all stored transactions
router.get("/summary", async (req, res) => {
  try {
    const result = await Transaction.aggregate([
      {
        $group: {
          _id: "$type",
          total: { $sum: "$amount" },
        },
      },
    ]);

    const income =
      result.find((item) => item._id === "income")?.total || 0;

    const expenses =
      result.find((item) => item._id === "expense")?.total || 0;

    res.json({
      income,
      expenses,
      balance: income - expenses,
    });
  } catch (error) {
    console.error("Calculate summary:", error);
    res.status(500).json({ message: "Could not calculate summary" });
  }
});

// POST a new transaction
router.post("/", async (req, res) => {
  try {
    const { type, amount, category, description, date } = req.body;

    if (!["income", "expense"].includes(type)) {
      return res.status(400).json({ message: "Invalid transaction type" });
    }

    if (
      amount === undefined ||
      amount === null ||
      amount === "" ||
      !Number.isFinite(Number(amount)) ||
      Number(amount) <= 0
    ) {
      return res.status(400).json({
        message: "Amount must be greater than zero",
      });
    }

    if (typeof category !== "string" || !category.trim()) {
      return res.status(400).json({ message: "Category is required" });
    }

    const transaction = await Transaction.create({
      type,
      amount: Number(amount),
      category: category.trim(),
      description: description || "",
      date: date || Date.now(),
    });

    res.status(201).json(transaction);
  } catch (error) {
    console.error("Create transaction:", error);
    res.status(400).json({ message: "Could not create transaction" });
  }
});

// PUT: update an existing transaction
router.put("/:id", async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid transaction ID" });
    }

    const updates = {};
    const allowedFields = [
      "type",
      "amount",
      "category",
      "description",
      "date",
    ];

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: "No fields to update" });
    }

    if (
      updates.type !== undefined &&
      !["income", "expense"].includes(updates.type)
    ) {
      return res.status(400).json({ message: "Invalid transaction type" });
    }

    if (updates.amount !== undefined) {
      if (
        updates.amount === null ||
        updates.amount === "" ||
        !Number.isFinite(Number(updates.amount)) ||
        Number(updates.amount) <= 0
      ) {
        return res.status(400).json({
          message: "Amount must be greater than zero",
        });
      }

      updates.amount = Number(updates.amount);
    }

    if (updates.category !== undefined) {
      if (
        typeof updates.category !== "string" ||
        !updates.category.trim()
      ) {
        return res.status(400).json({ message: "Category is required" });
      }

      updates.category = updates.category.trim();
    }

    const transaction = await Transaction.findByIdAndUpdate(
      req.params.id,
      updates,
      {
        new: true,
        runValidators: true,
      }
    );

    if (!transaction) {
      return res.status(404).json({ message: "Transaction not found" });
    }

    res.json(transaction);
  } catch (error) {
    console.error("Update transaction:", error);
    res.status(400).json({ message: "Could not update transaction" });
  }
});

// DELETE a transaction
router.delete("/:id", async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid transaction ID" });
    }

    const transaction = await Transaction.findByIdAndDelete(req.params.id);

    if (!transaction) {
      return res.status(404).json({ message: "Transaction not found" });
    }

    res.json({ message: "Transaction deleted successfully" });
  } catch (error) {
    console.error("Delete transaction:", error);
    res.status(500).json({ message: "Could not delete transaction" });
  }
});

module.exports = router;
