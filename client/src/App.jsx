import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  Activity,
  ArrowDownLeft,
  ArrowUpRight,
  Banknote,
  BriefcaseBusiness,
  Check,
  ChevronDown,
  CircleHelp,
  Clock3,
  CreditCard,
  GraduationCap,
  HeartPulse,
  LayoutDashboard,
  Menu,
  Pencil,
  Plane,
  Plus,
  Receipt,
  RefreshCw,
  Search,
  ShoppingBag,
  Trash2,
  TrendingDown,
  TrendingUp,
  Utensils,
  Wallet,
  X,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import "./App.css";

const API = "http://localhost:5000/api/transactions";

const CATEGORY_COLORS = [
  "#467a70",
  "#6e91a7",
  "#c48a69",
  "#9b83a8",
  "#d2b06d",
  "#72806a",
  "#a47476",
];

const INCOME_CATEGORIES = [
  "Salary",
  "Freelance",
  "Business",
  "Investment",
  "Other",
];

const EXPENSE_CATEGORIES = [
  "Food",
  "Travel",
  "Shopping",
  "Bills",
  "Education",
  "Health",
  "Other",
];

const CATEGORY_ICONS = {
  Food: Utensils,
  Travel: Plane,
  Shopping: ShoppingBag,
  Bills: Receipt,
  Education: GraduationCap,
  Health: HeartPulse,
  Salary: BriefcaseBusiness,
  Freelance: BriefcaseBusiness,
  Business: Banknote,
  Investment: TrendingUp,
  Other: CircleHelp,
};

const emptyForm = () => ({
  type: "expense",
  amount: "",
  category: "Food",
  description: "",
  date: localDateInput(),
});

function localDateInput(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function toDateInput(value) {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    return value.slice(0, 10);
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? localDateInput() : localDateInput(date);
}

function money(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);
}

function compactMoney(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(Number(value) || 0);
}

function readableError(error, fallback) {
  return error.response?.data?.message || fallback;
}

function SummaryCard({ title, amount, icon: Icon, accent, detail }) {
  return (
    <article className={`summary-card summary-card-${accent}`}>
      <div className="summary-card-top">
        <span className="summary-label">{title}</span>
        <span className="summary-icon" aria-hidden="true">
          <Icon size={19} strokeWidth={1.9} />
        </span>
      </div>
      <p className="summary-amount">
        {title === "Transactions" ? Number(amount).toLocaleString("en-IN") : money(amount)}
      </p>
      <span className="summary-detail">{detail}</span>
    </article>
  );
}

function App() {
  const [transactions, setTransactions] = useState([]);
  const [summary, setSummary] = useState({
    income: 0,
    expenses: 0,
    balance: 0,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [formError, setFormError] = useState("");
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [activeSection, setActiveSection] = useState("dashboard");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [dialog, setDialog] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const loadData = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setError("");

    try {
      const [transactionResponse, summaryResponse] = await Promise.all([
        axios.get(API),
        axios.get(`${API}/summary`),
      ]);

      setTransactions(transactionResponse.data);
      setSummary(summaryResponse.data);
    } catch (requestError) {
      console.error("Load data failed:", requestError);
      setError(
        readableError(
          requestError,
          "Could not load your data. Check the backend and MongoDB connection."
        )
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const request = window.setTimeout(() => loadData(), 0);
    return () => window.clearTimeout(request);
  }, [loadData]);

  useEffect(() => {
    if (!dialog) return undefined;

    function handleKeyDown(event) {
      if (event.key === "Escape" && !saving && !deleting) {
        setDialog(null);
        setFormError("");
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [dialog, saving, deleting]);

  const categories = useMemo(
    () => [...new Set(transactions.map((transaction) => transaction.category))].sort(),
    [transactions]
  );

  const filteredTransactions = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();

    return transactions.filter((transaction) => {
      const date = toDateInput(transaction.date);
      const text = `${transaction.category} ${transaction.description || ""}`.toLocaleLowerCase();

      return (
        (filterType === "all" || transaction.type === filterType) &&
        (filterCategory === "all" || transaction.category === filterCategory) &&
        (!dateFrom || date >= dateFrom) &&
        (!dateTo || date <= dateTo) &&
        (!query || text.includes(query))
      );
    });
  }, [transactions, search, filterType, filterCategory, dateFrom, dateTo]);

  const categoryData = useMemo(() => {
    const groups = new Map();

    transactions
      .filter((transaction) => transaction.type === "expense")
      .forEach((transaction) => {
        const total = groups.get(transaction.category) || 0;
        groups.set(transaction.category, total + Number(transaction.amount));
      });

    return [...groups].map(([name, amount]) => ({ name, amount }));
  }, [transactions]);

  const monthlyData = useMemo(() => {
    const groups = new Map();

    transactions.forEach((transaction) => {
      const date = new Date(transaction.date);
      if (Number.isNaN(date.getTime())) return;

      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      const month = date.toLocaleDateString("en-IN", {
        month: "short",
        year: "2-digit",
      });

      if (!groups.has(key)) groups.set(key, { key, month, income: 0, expenses: 0 });

      const monthData = groups.get(key);
      if (transaction.type === "income") {
        monthData.income += Number(transaction.amount);
      } else {
        monthData.expenses += Number(transaction.amount);
      }
    });

    return [...groups.values()].sort((a, b) => a.key.localeCompare(b.key));
  }, [transactions]);

  function showNotice(message) {
    setNotice(message);
    window.setTimeout(() => setNotice((current) => (current === message ? "" : current)), 3500);
  }

  function openAdd() {
    setForm(emptyForm());
    setFormError("");
    setError("");
    setDialog({ mode: "add" });
  }

  function openEdit(transaction) {
    setForm({
      type: transaction.type,
      amount: String(transaction.amount),
      category: transaction.category,
      description: transaction.description || "",
      date: toDateInput(transaction.date),
    });
    setFormError("");
    setError("");
    setDialog({ mode: "edit", transaction });
  }

  function updateForm(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setFormError("");
  }

  function updateType(type) {
    const allowedCategories = type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
    setForm((current) => ({
      ...current,
      type,
      category: allowedCategories.includes(current.category)
        ? current.category
        : allowedCategories[0],
    }));
    setFormError("");
  }

  async function submitTransaction(event) {
    event.preventDefault();
    const amount = Number(form.amount);

    if (!form.amount.trim() || !Number.isFinite(amount) || amount <= 0) {
      setFormError("Enter an amount greater than zero.");
      return;
    }
    if (!form.category.trim() || !form.date) {
      setFormError("Choose a category and date before saving.");
      return;
    }

    setSaving(true);
    setFormError("");
    setError("");

    try {
      const payload = {
        ...form,
        amount,
        description: form.description.trim(),
      };

      if (dialog.mode === "edit") {
        await axios.put(`${API}/${dialog.transaction._id}`, payload);
      } else {
        await axios.post(API, payload);
      }

      setDialog(null);
      await loadData(false);
      showNotice(dialog.mode === "edit" ? "Transaction updated." : "Transaction added.");
    } catch (requestError) {
      console.error("Save transaction failed:", requestError);
      setFormError(
        readableError(
          requestError,
          dialog.mode === "edit"
            ? "Could not update this transaction. Please try again."
            : "Could not add this transaction. Please try again."
        )
      );
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!dialog || dialog.mode !== "delete") return;

    setDeleting(true);
    setError("");
    try {
      await axios.delete(`${API}/${dialog.transaction._id}`);
      setDialog(null);
      await loadData(false);
      showNotice("Transaction deleted.");
    } catch (requestError) {
      console.error("Delete transaction failed:", requestError);
      setError(readableError(requestError, "Could not delete this transaction."));
      setDialog(null);
    } finally {
      setDeleting(false);
    }
  }

  function clearFilters() {
    setSearch("");
    setFilterType("all");
    setFilterCategory("all");
    setDateFrom("");
    setDateTo("");
  }

  function navigateTo(section) {
    setActiveSection(section);
    setMobileNavOpen(false);
    document.getElementById(section)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const hasFilters =
    search || filterType !== "all" || filterCategory !== "all" || dateFrom || dateTo;

  return (
    <div className="dashboard-shell">
      {mobileNavOpen && (
        <button
          type="button"
          className="mobile-scrim"
          aria-label="Close navigation menu"
          onClick={() => setMobileNavOpen(false)}
        />
      )}
      <aside className={`sidebar${mobileNavOpen ? " sidebar-open" : ""}`}>
        <a className="brand" href="#dashboard" onClick={() => navigateTo("dashboard")}>
          <span className="brand-mark"><Activity size={21} strokeWidth={2.3} /></span>
          <span className="brand-copy">
            <strong>SpendWise</strong>
            <small>PERSONAL FINANCE</small>
          </span>
        </a>

        <div className="nav-section-label">WORKSPACE</div>
        <nav className="side-nav" aria-label="Main navigation">
          <button
            type="button"
            className={activeSection === "dashboard" ? "nav-link active" : "nav-link"}
            onClick={() => navigateTo("dashboard")}
          >
            <LayoutDashboard size={18} /> <span>Dashboard</span>
          </button>
          <button
            type="button"
            className={activeSection === "transactions" ? "nav-link active" : "nav-link"}
            onClick={() => navigateTo("transactions")}
          >
            <CreditCard size={18} /> <span>Transactions</span>
          </button>
          <button
            type="button"
            className={activeSection === "analytics" ? "nav-link active" : "nav-link"}
            onClick={() => navigateTo("analytics")}
          >
            <Activity size={18} /> <span>Analytics</span>
          </button>
        </nav>

        <div className="sidebar-bottom">
          <div className="sidebar-note">
            <span className="sidebar-note-icon"><Wallet size={18} /></span>
            <div>
              <strong>Your money, in focus.</strong>
              <p>Every small step adds up.</p>
            </div>
          </div>
          <div className="sidebar-footer">Spend intentionally. Live confidently.</div>
        </div>
      </aside>

      <main className="main-content" id="dashboard">
        <header className="topbar">
          <button
            type="button"
            className="mobile-menu-button icon-button"
            onClick={() => setMobileNavOpen(true)}
            aria-label="Open navigation menu"
          >
            <Menu size={20} />
          </button>
          <div className="topbar-title">
            <div className="breadcrumb">OVERVIEW <span>/</span> DASHBOARD</div>
            <h1>Good to see you</h1>
            <p>Your financial picture, all in one place.</p>
          </div>
          <div className="topbar-actions">
            <button
              type="button"
              className="button button-secondary refresh-button"
              onClick={() => loadData()}
              disabled={loading}
            >
              <RefreshCw size={16} className={loading ? "spin" : ""} />
              <span>Refresh</span>
            </button>
            <button type="button" className="button button-primary" onClick={openAdd}>
              <Plus size={17} /> <span>Add transaction</span>
            </button>
          </div>
        </header>

        {error && (
          <div className="toast toast-error" role="alert">
            <span>{error}</span>
            <button type="button" onClick={() => setError("")} aria-label="Dismiss error">
              <X size={17} />
            </button>
          </div>
        )}
        {notice && (
          <div className="toast toast-success" role="status">
            <Check size={17} />
            <span>{notice}</span>
            <button type="button" onClick={() => setNotice("")} aria-label="Dismiss notification">
              <X size={17} />
            </button>
          </div>
        )}

        <section className="summary-grid" aria-label="Financial summary">
          {loading && transactions.length === 0 ? (
            <>
              <div className="summary-skeleton" />
              <div className="summary-skeleton" />
              <div className="summary-skeleton" />
              <div className="summary-skeleton" />
            </>
          ) : (
            <>
              <SummaryCard
                title="Total balance"
                amount={summary.balance}
                icon={Wallet}
                accent="balance"
                detail="Income minus expenses"
              />
              <SummaryCard
                title="Total income"
                amount={summary.income}
                icon={ArrowDownLeft}
                accent="income"
                detail="Money received"
              />
              <SummaryCard
                title="Total expenses"
                amount={summary.expenses}
                icon={ArrowUpRight}
                accent="expense"
                detail="Money spent"
              />
              <SummaryCard
                title="Transactions"
                amount={transactions.length}
                icon={Activity}
                accent="count"
                detail="All recorded activity"
              />
            </>
          )}
        </section>

        <section className="analytics-section" id="analytics">
          <div className="section-heading">
            <div>
              <p className="section-kicker">YOUR ACTIVITY</p>
              <h2>Spending insights</h2>
            </div>
            <span className="section-caption"><Activity size={15} /> Based on all transactions</span>
          </div>
          <div className="charts-grid">
            <article className="panel chart-panel">
              <div className="panel-heading">
                <div>
                  <h3>Expenses by category</h3>
                  <p>See where your money goes</p>
                </div>
                <span className="panel-heading-icon expense-heading-icon"><TrendingDown size={17} /></span>
              </div>
              {loading && transactions.length === 0 ? (
                <div className="chart-skeleton" />
              ) : categoryData.length === 0 ? (
                <div className="chart-empty">
                  <span className="empty-icon"><Activity size={21} /></span>
                  <strong>No expense data yet</strong>
                  <p>Add an expense to see your category breakdown.</p>
                </div>
              ) : (
                <div className="pie-chart-wrap">
                  <ResponsiveContainer width="100%" height={245}>
                    <PieChart>
                      <Pie
                        data={categoryData}
                        dataKey="amount"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={63}
                        outerRadius={91}
                        paddingAngle={3}
                        stroke="none"
                      >
                        {categoryData.map((item, index) => (
                          <Cell key={item.name} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value) => [money(value), "Expenses"]}
                        contentStyle={{ borderRadius: 12, border: "1px solid #e8ece9", boxShadow: "0 8px 24px rgba(23, 43, 37, .10)" }}
                      />
                      <Legend
                        verticalAlign="bottom"
                        iconType="circle"
                        iconSize={8}
                        wrapperStyle={{ fontSize: "11px", paddingTop: 6 }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="donut-center" aria-hidden="true">
                    <span>Total spent</span>
                    <strong>{compactMoney(summary.expenses)}</strong>
                  </div>
                </div>
              )}
            </article>

            <article className="panel chart-panel">
              <div className="panel-heading">
                <div>
                  <h3>Income vs. expenses</h3>
                  <p>Monthly cash flow comparison</p>
                </div>
                <span className="panel-heading-icon income-heading-icon"><TrendingUp size={17} /></span>
              </div>
              {loading && transactions.length === 0 ? (
                <div className="chart-skeleton" />
              ) : monthlyData.length === 0 ? (
                <div className="chart-empty">
                  <span className="empty-icon"><Clock3 size={21} /></span>
                  <strong>Nothing to chart yet</strong>
                  <p>Your monthly comparison will appear when you add transactions.</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={278}>
                  <BarChart data={monthlyData} margin={{ top: 12, right: 8, left: 0, bottom: 0 }} barGap={7}>
                    <CartesianGrid vertical={false} stroke="#edf0ee" strokeDasharray="4 4" />
                    <XAxis
                      dataKey="month"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "#8a9690", fontSize: 11 }}
                      dy={9}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "#8a9690", fontSize: 10 }}
                      tickFormatter={compactMoney}
                      width={56}
                    />
                    <Tooltip
                      formatter={(value, name) => [money(value), name === "income" ? "Income" : "Expenses"]}
                      labelStyle={{ color: "#24342f", fontWeight: 700 }}
                      contentStyle={{ borderRadius: 12, border: "1px solid #e8ece9", boxShadow: "0 8px 24px rgba(23, 43, 37, .10)" }}
                      cursor={{ fill: "#f4f7f5" }}
                    />
                    <Legend
                      verticalAlign="top"
                      align="right"
                      iconType="circle"
                      iconSize={8}
                      wrapperStyle={{ fontSize: "11px", paddingBottom: 12 }}
                    />
                    <Bar dataKey="income" name="Income" fill="#5b9a7c" radius={[5, 5, 0, 0]} maxBarSize={27} />
                    <Bar dataKey="expenses" name="Expenses" fill="#d88573" radius={[5, 5, 0, 0]} maxBarSize={27} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </article>
          </div>
        </section>

        <section className="transactions-section" id="transactions">
          <div className="section-heading transaction-section-heading">
            <div>
              <p className="section-kicker">YOUR MONEY MOVEMENT</p>
              <h2>Recent transactions</h2>
            </div>
            <button type="button" className="button button-primary" onClick={openAdd}>
              <Plus size={17} /> <span>Add transaction</span>
            </button>
          </div>

          <section className="panel transactions-panel" aria-label="Transactions">
            <div className="transactions-toolbar">
              <div className="search-field">
                <Search size={17} aria-hidden="true" />
                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search transactions"
                  aria-label="Search transactions"
                />
                {search && (
                  <button type="button" onClick={() => setSearch("")} aria-label="Clear search">
                    <X size={15} />
                  </button>
                )}
              </div>
              <div className="filter-group">
                <label className="select-control">
                  <span className="sr-only">Transaction type</span>
                  <select value={filterType} onChange={(event) => setFilterType(event.target.value)}>
                    <option value="all">All types</option>
                    <option value="income">Income</option>
                    <option value="expense">Expense</option>
                  </select>
                  <ChevronDown size={14} aria-hidden="true" />
                </label>
                <label className="select-control">
                  <span className="sr-only">Category</span>
                  <select value={filterCategory} onChange={(event) => setFilterCategory(event.target.value)}>
                    <option value="all">All categories</option>
                    {categories.map((category) => <option key={category} value={category}>{category}</option>)}
                  </select>
                  <ChevronDown size={14} aria-hidden="true" />
                </label>
              </div>
            </div>
            <div className="date-filters">
              <label>
                <span>From</span>
                <input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} aria-label="Filter from date" />
              </label>
              <label>
                <span>To</span>
                <input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} aria-label="Filter to date" />
              </label>
              {hasFilters && (
                <button type="button" className="clear-filters" onClick={clearFilters}>Clear filters</button>
              )}
              <span className="result-count">
                {filteredTransactions.length} of {transactions.length} transactions
              </span>
            </div>

            <div className="transaction-list">
              <div className="transaction-table-heading" aria-hidden="true">
                <span>TRANSACTION</span>
                <span>CATEGORY</span>
                <span>DATE</span>
                <span>TYPE</span>
                <span className="amount-heading">AMOUNT</span>
                <span className="actions-heading">ACTIONS</span>
              </div>
              {loading && transactions.length === 0 ? (
                <div className="list-skeletons" aria-label="Loading transactions">
                  <div /><div /><div /><div />
                </div>
              ) : filteredTransactions.length === 0 ? (
                <div className="transaction-empty">
                  <span className="empty-icon"><CreditCard size={21} /></span>
                  <strong>{transactions.length === 0 ? "No transactions yet" : "No matching transactions"}</strong>
                  <p>
                    {transactions.length === 0
                      ? "Add your first transaction to start seeing your finances clearly."
                      : "Try adjusting your search or filters."}
                  </p>
                  {transactions.length === 0 && (
                    <button type="button" className="button button-secondary" onClick={openAdd}>
                      <Plus size={16} /> Add your first transaction
                    </button>
                  )}
                </div>
              ) : (
                filteredTransactions.map((transaction) => {
                  const CategoryIcon = CATEGORY_ICONS[transaction.category] || CircleHelp;
                  const isIncome = transaction.type === "income";
                  return (
                    <article className="transaction-row" key={transaction._id}>
                      <div className="transaction-main">
                        <span className={`transaction-icon ${isIncome ? "income-icon" : "expense-icon"}`}>
                          <CategoryIcon size={18} strokeWidth={1.8} />
                        </span>
                        <span className="transaction-description">
                          <strong>{transaction.description || transaction.category}</strong>
                          <small>{transaction.description ? transaction.category : `${isIncome ? "Income" : "Expense"} transaction`}</small>
                        </span>
                      </div>
                      <span className="transaction-category">{transaction.category}</span>
                      <span className="transaction-date">
                        {new Date(transaction.date).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                      <span className={`type-badge ${isIncome ? "badge-income" : "badge-expense"}`}>
                        {isIncome ? "Income" : "Expense"}
                      </span>
                      <strong className={`transaction-amount ${isIncome ? "amount-income" : "amount-expense"}`}>
                        {isIncome ? "+" : "−"}{money(transaction.amount)}
                      </strong>
                      <div className="transaction-actions">
                        <button
                          type="button"
                          className="icon-button edit-action"
                          onClick={() => openEdit(transaction)}
                          aria-label={`Edit ${transaction.category} transaction`}
                          title="Edit transaction"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          type="button"
                          className="icon-button delete-action"
                          onClick={() => setDialog({ mode: "delete", transaction })}
                          aria-label={`Delete ${transaction.category} transaction`}
                          title="Delete transaction"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </article>
                  );
                })
              )}
            </div>
          </section>
        </section>

        <footer className="app-footer">
          <span>SpendWise</span><span>Make every rupee count.</span>
        </footer>
      </main>

      {(dialog?.mode === "add" || dialog?.mode === "edit") && (
        <div
          className="dialog-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !saving) {
              setDialog(null);
              setFormError("");
            }
          }}
        >
          <section className="transaction-dialog" role="dialog" aria-modal="true" aria-labelledby="transaction-dialog-title">
            <div className="dialog-heading">
              <div>
                <span className="dialog-kicker">{dialog.mode === "edit" ? "UPDATE DETAILS" : "NEW ENTRY"}</span>
                <h2 id="transaction-dialog-title">{dialog.mode === "edit" ? "Edit transaction" : "Add transaction"}</h2>
                <p>Keep your finances up to date.</p>
              </div>
              <button
                type="button"
                className="icon-button dialog-close"
                onClick={() => { setDialog(null); setFormError(""); }}
                disabled={saving}
                aria-label="Close dialog"
              >
                <X size={19} />
              </button>
            </div>
            <form onSubmit={submitTransaction} noValidate>
              <fieldset className="type-fieldset">
                <legend>Transaction type</legend>
                <div className="type-segment">
                  <button
                    type="button"
                    className={form.type === "expense" ? "selected segment-expense" : ""}
                    onClick={() => updateType("expense")}
                    aria-pressed={form.type === "expense"}
                  >
                    <ArrowUpRight size={17} /> Expense
                  </button>
                  <button
                    type="button"
                    className={form.type === "income" ? "selected segment-income" : ""}
                    onClick={() => updateType("income")}
                    aria-pressed={form.type === "income"}
                  >
                    <ArrowDownLeft size={17} /> Income
                  </button>
                </div>
              </fieldset>
              <label className="form-field">
                <span>Amount</span>
                <span className="amount-input-wrap">
                  <span aria-hidden="true">₹</span>
                  <input
                    name="amount"
                    type="number"
                    min="0.01"
                    step="0.01"
                    inputMode="decimal"
                    placeholder="0.00"
                    value={form.amount}
                    onChange={updateForm}
                    required
                    autoFocus
                    aria-describedby={formError ? "form-error" : undefined}
                  />
                </span>
              </label>
              <div className="form-two-columns">
                <label className="form-field">
                  <span>Category</span>
                  <select name="category" value={form.category} onChange={updateForm} required>
                    {(form.type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map((category) => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </label>
                <label className="form-field">
                  <span>Date</span>
                  <input name="date" type="date" value={form.date} onChange={updateForm} required />
                </label>
              </div>
              <label className="form-field">
                <span>Description <small>(optional)</small></span>
                <input
                  name="description"
                  type="text"
                  maxLength={120}
                  placeholder="e.g. Monthly groceries"
                  value={form.description}
                  onChange={updateForm}
                />
              </label>
              {formError && <p className="form-error" id="form-error" role="alert">{formError}</p>}
              <div className="dialog-actions">
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={() => { setDialog(null); setFormError(""); }}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button type="submit" className="button button-primary" disabled={saving}>
                  {saving ? <RefreshCw size={16} className="spin" /> : <Check size={16} />}
                  {saving ? "Saving..." : dialog.mode === "edit" ? "Save changes" : "Save transaction"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {dialog?.mode === "delete" && (
        <div className="dialog-backdrop">
          <section className="confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="delete-dialog-title" aria-describedby="delete-dialog-description">
            <span className="confirm-icon"><Trash2 size={21} /></span>
            <h2 id="delete-dialog-title">Delete this transaction?</h2>
            <p id="delete-dialog-description">
              This will permanently remove the {dialog.transaction.category} transaction for{" "}
              <strong>{money(dialog.transaction.amount)}</strong>.
            </p>
            <div className="dialog-actions">
              <button type="button" className="button button-secondary" onClick={() => setDialog(null)} disabled={deleting}>
                Cancel
              </button>
              <button type="button" className="button button-danger" onClick={confirmDelete} disabled={deleting}>
                {deleting ? <RefreshCw size={16} className="spin" /> : <Trash2 size={16} />}
                {deleting ? "Deleting..." : "Delete transaction"}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

export default App;
