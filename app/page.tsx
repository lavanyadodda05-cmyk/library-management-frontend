

"use client";

import { useEffect, useState } from "react";

type Book = {
  id: number;
  title: string;
  author: string;
  isbn: string | null;
  year: number | null;
  available: boolean;
};

type BookForm = {
  title: string;
  author: string;
  isbn: string;
  year: string;
};

const API_BASE = (
  process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:5000"
).replace(/\/$/, "");

const emptyForm: BookForm = {
  title: "",
  author: "",
  isbn: "",
  year: "",
};

async function apiRequest<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    cache: "no-store",
  });

  const text = await response.text();
  let data: unknown = null;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }

  if (!response.ok) {
    const errorData = data as {
      error?: { message?: string };
    } | null;

    throw new Error(
      errorData?.error?.message || `Request failed: ${response.status}`
    );
  }

  return data as T;
}

export default function Dashboard() {
  const [books, setBooks] = useState<Book[]>([]);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<BookForm>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function loadBooks() {
    try {
      setLoading(true);
      const data = await apiRequest<Book[]>("/books");
      setBooks(data);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Unable to load books."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadBooks();
  }, []);

  const filteredBooks = books.filter((book) =>
    `${book.title} ${book.author} ${book.isbn || ""}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  const available = books.filter((book) => book.available).length;
  const borrowed = books.filter((book) => !book.available).length;

  function openAddForm() {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(true);
    setMessage("");
  }

  function openEditForm(book: Book) {
    setEditingId(book.id);
    setForm({
      title: book.title,
      author: book.author,
      isbn: book.isbn || "",
      year: book.year?.toString() || "",
    });
    setShowForm(true);
    setMessage("");
  }

  async function saveBook(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setMessage("");

    const payload = {
      title: form.title.trim(),
      author: form.author.trim(),
      isbn: form.isbn.trim() || null,
      year: form.year.trim() ? Number(form.year) : null,
    };

    try {
      if (editingId !== null) {
        await apiRequest<Book>(`/books/${editingId}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });

        setMessage("Book updated successfully!");
      } else {
        await apiRequest<Book>("/books", {
          method: "POST",
          body: JSON.stringify(payload),
        });

        setMessage("Book added successfully!");
      }

      setShowForm(false);
      setEditingId(null);
      setForm(emptyForm);

      await loadBooks();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Unable to save book."
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteBook(id: number) {
    if (!window.confirm("Are you sure you want to delete this book?")) {
      return;
    }

    setMessage("");

    try {
      await apiRequest<void>(`/books/${id}`, {
        method: "DELETE",
      });

      setMessage("Book deleted successfully!");
      await loadBooks();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Unable to delete book."
      );
    }
  }

  async function changeBookStatus(book: Book) {
    setMessage("");

    const action = book.available ? "borrow" : "return";

    try {
      await apiRequest<Book>(`/books/${book.id}/${action}`, {
        method: "POST",
      });

      setMessage(
        book.available
          ? "Book borrowed successfully!"
          : "Book returned successfully!"
      );

      await loadBooks();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to update book status."
      );
    }
  }

  const stats = [
    { title: "Total Books", value: books.length, icon: "📚" },
    { title: "Available Books", value: available, icon: "📖" },
    { title: "Borrowed Books", value: borrowed, icon: "🔄" },
  ];

  return (
    <div className="dashboard">

      <aside className="sidebar">
        <h2>📚 LibraryHub</h2>

        <p className="menu-title">MAIN MENU</p>

        <a className="menu-item active" href="#dashboard">
          <span>▦</span> Dashboard
        </a>

        <a className="menu-item" href="#books">
          <span>📚</span> Books
        </a>
      </aside>

      <main className="main">

        <header className="header" id="dashboard">
          <div>
            <h1>Library Management Dashboard</h1>
            <p>Welcome back! Manage your library collection.</p>
          </div>

          <div className="header-actions">
            <button className="primary" onClick={openAddForm}>
              + Add New Book
            </button>
          </div>
        </header>

        <section className="stats">
          {stats.map((stat) => (
            <div className="stat-card" key={stat.title}>
              <div className="stat-icon blue">{stat.icon}</div>
              <p>{stat.title}</p>
              <h2>{stat.value}</h2>
              <small>Current library overview</small>
            </div>
          ))}
        </section>

        <section className="panel books-panel" id="books">

          <div className="panel-heading">
            <div>
              <h3>Books Inventory</h3>
              <p>Search, add, edit and manage your books</p>
            </div>
          </div>

          {message && (
            <p role="status" className="message">
              {message}
            </p>
          )}

          <input
            className="search-input"
            type="text"
            placeholder="Search by title, author or ISBN..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          {showForm && (
            <form className="book-form" onSubmit={saveBook}>

              <h3>
                {editingId !== null ? "Edit Book" : "Add New Book"}
              </h3>

              <input
                placeholder="Book Title"
                value={form.title}
                onChange={(e) =>
                  setForm({ ...form, title: e.target.value })
                }
                maxLength={200}
                required
              />

              <input
                placeholder="Author Name"
                value={form.author}
                onChange={(e) =>
                  setForm({ ...form, author: e.target.value })
                }
                maxLength={100}
                required
              />

              <input
                placeholder="ISBN (Optional)"
                value={form.isbn}
                onChange={(e) =>
                  setForm({ ...form, isbn: e.target.value })
                }
              />

              <input
                type="number"
                placeholder="Publication Year (Optional)"
                value={form.year}
                onChange={(e) =>
                  setForm({ ...form, year: e.target.value })
                }
              />

              <button
                className="primary"
                type="submit"
                disabled={saving}
              >
                {saving
                  ? "Saving..."
                  : editingId !== null
                    ? "Update Book"
                    : "Save Book"}
              </button>

              <button
                className="secondary"
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingId(null);
                  setForm(emptyForm);
                }}
              >
                Cancel
              </button>

            </form>
          )}

          <div className="table-wrap">
            <table>

              <thead>
                <tr>
                  <th>ID</th>
                  <th>Book Title</th>
                  <th>Author</th>
                  <th>ISBN</th>
                  <th>Year</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7}>Loading books...</td>
                  </tr>
                ) : filteredBooks.length > 0 ? (
                  filteredBooks.map((book) => (
                    <tr key={book.id}>

                      <td>{book.id}</td>

                      <td>
                        <strong>{book.title}</strong>
                      </td>

                      <td>{book.author}</td>
                      <td>{book.isbn || "—"}</td>
                      <td>{book.year ?? "—"}</td>

                      <td>
                        <span
                          className={`status ${
                            book.available ? "available" : "borrowed"
                          }`}
                        >
                          {book.available ? "Available" : "Borrowed"}
                        </span>
                      </td>

                      <td>
                        <button
                          className="action"
                          onClick={() => openEditForm(book)}
                        >
                          Edit
                        </button>{" "}

                        <button
                          className="action"
                          onClick={() => changeBookStatus(book)}
                        >
                          {book.available ? "Borrow" : "Return"}
                        </button>{" "}

                        <button
                          className="delete"
                          onClick={() => deleteBook(book.id)}
                        >
                          Delete
                        </button>
                      </td>

                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7}>No books found.</td>
                  </tr>
                )}
              </tbody>

            </table>
          </div>

        </section>

        <footer>
          © 2026 LibraryHub. Library Management System.
        </footer>

      </main>
    </div>
  );
}

