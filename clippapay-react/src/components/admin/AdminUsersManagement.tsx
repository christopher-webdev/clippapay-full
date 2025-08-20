import React, { useEffect, useState } from "react";
import {
  HiSearch,
  HiBan,
  HiCheckCircle,
  HiUserRemove,
  HiMail,
  HiPhone,
  HiOfficeBuilding,
} from "react-icons/hi";
import axios from "axios";

const API_BASE = import.meta.env.VITE_API_URL || "";

interface UserRow {
  _id: string;
  email: string;
  role: string;
  firstName?: string;
  lastName?: string;
  company?: string;
  contactName?: string;
  phone?: string;
  country?: string;
  isBlocked?: boolean;
  isVerified?: boolean;
  createdAt: string;
}

const roleLabels: Record<string, string> = {
  clipper: "Clipper",
  advertiser: "Advertiser",
  admin: "Admin",
  "ad-worker": "Ad Worker",
  platform: "Platform",
};

const PAGE_SIZE = 1000000;

export default function UsersManagement() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [batchLoading, setBatchLoading] = useState(false);
  const [page, setPage] = useState(1);

  // Fetch all users
  const fetchUsers = async () => {
    setLoading(true);
    setErr(null);
    try {
      const { data } = await axios.get(`${API_BASE}/user/all`, {
        withCredentials: true,
      });
      setUsers(data);
      setSelected([]);
      setPage(1);
    } catch (e: any) {
      setErr(e?.response?.data?.error || "Failed to fetch users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line
  }, []);

  // Filtering logic
  const filtered = users.filter((u) => {
    if (
      search &&
      !(
        u.email?.toLowerCase().includes(search.toLowerCase()) ||
        (u.firstName &&
          u.firstName.toLowerCase().includes(search.toLowerCase())) ||
        (u.lastName &&
          u.lastName.toLowerCase().includes(search.toLowerCase())) ||
        (u.company &&
          u.company.toLowerCase().includes(search.toLowerCase())) ||
        (u.contactName &&
          u.contactName.toLowerCase().includes(search.toLowerCase())) ||
        (u.phone && u.phone.includes(search)) ||
        (u.country && u.country.toLowerCase().includes(search.toLowerCase()))
      )
    )
      return false;
    if (role && u.role !== role) return false;
    if (status === "blocked" && !u.isBlocked) return false;
    if (status === "verified" && !u.isVerified) return false;
    if (status === "pending" && (u.isVerified || u.isBlocked)) return false;
    return true;
  });

  // Pagination
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const pageUsers = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Select logic
  const toggleSelect = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((sid) => sid !== id) : [...prev, id]
    );
  };
  const selectAllPage = () => {
    setSelected(pageUsers.map((u) => u._id));
  };
  const clearSelection = () => setSelected([]);

  // Batch Actions
  const batchAction = async (
    action: "block" | "unblock" | "delete",
    confirmMsg?: string
  ) => {
    if (selected.length === 0) return;
    if (confirmMsg && !window.confirm(confirmMsg)) return;
    setBatchLoading(true);
    setErr(null);
    try {
      const { data } = await axios.post(
        `/user/all`,
        { action, userIds: selected },
        { withCredentials: true }
      );
      fetchUsers();
    } catch (err: any) {
      setErr(
        err?.response?.data?.error ||
        err?.message ||
        "Error with batch action"
      );
    } finally {
      setBatchLoading(false);
    }
  };

  // Single block/unblock
  const toggleBlock = async (id: string, block: boolean) => {
    setErr(null);
    try {
      const { data } = await axios.post(
        `/user/${id}/block`,
        { block },
        { withCredentials: true }
      );
      setUsers((prev) =>
        prev.map((u) => (u._id === id ? { ...u, isBlocked: block } : u))
      );
    } catch (err: any) {
      setErr(
        err?.response?.data?.error ||
        err?.message ||
        "Error blocking user"
      );
    }
  };

  // Single delete
  const deleteUser = async (id: string) => {
    if (
      !window.confirm(
        "Are you sure you want to delete this user? This cannot be undone."
      )
    )
      return;
    setErr(null);
    try {
      const { data } = await axios.delete(`${API_BASE}/user/${id}`, {
        withCredentials: true,
      });
      setUsers((prev) => prev.filter((u) => u._id !== id));
    } catch (err: any) {
      setErr(
        err?.response?.data?.error ||
        err?.message ||
        "Error deleting user"
      );
    }
  };

  // --- UI
  return (
    <div className="p-2 md:p-6">
      {/* FILTERS & BATCH ACTION BAR */}
      <div className="flex flex-col md:flex-row gap-2 md:gap-6 items-stretch md:items-end mb-3">
        <div className="relative w-full md:w-72">
          <input
            type="text"
            placeholder="Search name, email, company…"
            className="w-full rounded-xl border px-4 py-2 pl-10 text-sm focus:ring-2 focus:ring-indigo-500"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
          <HiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
        </div>
        <select
          className="rounded-xl border px-3 py-2 text-sm"
          value={role}
          onChange={(e) => {
            setRole(e.target.value);
            setPage(1);
          }}
        >
          <option value="">Role</option>
          {Object.keys(roleLabels).map((r) => (
            <option key={r} value={r}>
              {roleLabels[r]}
            </option>
          ))}
        </select>
        <select
          className="rounded-xl border px-3 py-2 text-sm"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All Status</option>
          <option value="verified">Verified</option>
          <option value="pending">Pending</option>
          <option value="blocked">Blocked</option>
        </select>
        {selected.length > 0 && (
          <div className="flex flex-col md:flex-row gap-2">
            <button
              className="px-3 py-1 rounded-xl text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700"
              disabled={batchLoading}
              onClick={selectAllPage}
              title="Select all on this page"
            >
              Select Page
            </button>
            <button
              className="px-3 py-1 rounded-xl text-xs font-semibold bg-gray-200 text-gray-700 hover:bg-gray-300"
              disabled={batchLoading}
              onClick={clearSelection}
            >
              Clear
            </button>
            <button
              className="px-3 py-1 rounded-xl text-xs font-semibold bg-red-600 text-white hover:bg-red-700"
              disabled={batchLoading}
              onClick={() => batchAction("block")}
            >
              Ban ({selected.length})
            </button>
            <button
              className="px-3 py-1 rounded-xl text-xs font-semibold bg-green-600 text-white hover:bg-green-700"
              disabled={batchLoading}
              onClick={() => batchAction("unblock")}
            >
              Unban ({selected.length})
            </button>
            <button
              className="px-3 py-1 rounded-xl text-xs font-semibold bg-gray-900 text-white hover:bg-gray-800"
              disabled={batchLoading}
              onClick={() =>
                batchAction(
                  "delete",
                  "Are you sure you want to delete all selected users? This cannot be undone."
                )
              }
            >
              Delete ({selected.length})
            </button>
          </div>
        )}
      </div>
      {err && <div className="text-red-600 text-sm mb-2">{err}</div>}

      {/* USERS TABLE */}
      <div className="overflow-x-auto bg-white shadow rounded-lg">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-2 py-2">
                <input
                  type="checkbox"
                  checked={
                    pageUsers.length > 0 &&
                    pageUsers.every((u) => selected.includes(u._id))
                  }
                  onChange={(e) =>
                    e.target.checked ? selectAllPage() : clearSelection()
                  }
                  className="w-4 h-4 accent-indigo-600"
                  aria-label="Select all"
                />
              </th>
              <th className="px-2 py-2 text-xs font-semibold text-gray-500 text-left">
                User
              </th>
              <th className="px-2 py-2 text-xs font-semibold text-gray-500 text-left">
                Role
              </th>
              <th className="px-2 py-2 text-xs font-semibold text-gray-500 text-left">
                Status
              </th>
              <th className="px-2 py-2 text-xs font-semibold text-gray-500 text-left">
                Joined
              </th>
              <th className="px-2 py-2 text-xs font-semibold text-gray-500 text-left">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={6} className="py-10 text-center text-gray-400">
                  Loading users…
                </td>
              </tr>
            ) : pageUsers.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-10 text-center text-gray-500">
                  No users found.
                </td>
              </tr>
            ) : (
              pageUsers.map((u) => (
                <tr
                  key={u._id}
                  className={
                    u.isBlocked
                      ? "bg-red-50"
                      : u.isVerified
                        ? "bg-green-50"
                        : ""
                  }
                >
                  {/* Checkbox */}
                  <td className="px-2 py-3 align-top">
                    <input
                      type="checkbox"
                      checked={selected.includes(u._id)}
                      onChange={() => toggleSelect(u._id)}
                      className="w-4 h-4 accent-indigo-600"
                      aria-label="Select user"
                    />
                  </td>
                  {/* Stacked details */}
                  <td className="px-2 py-3 align-top">
                    <div className="font-semibold text-sm text-gray-900">
                      {u.firstName || u.contactName || u.company || "—"} {u.lastName || ""}
                    </div>
                    <div className="flex flex-wrap gap-x-2 items-center text-xs text-gray-600 mt-1">
                      <span className="flex items-center gap-1">
                        <HiMail className="w-3 h-3" /> {u.email}
                      </span>
                      {u.phone && (
                        <span className="flex items-center gap-1">
                          <HiPhone className="w-3 h-3" /> {u.phone}
                        </span>
                      )}
                      {u.company && (
                        <span className="flex items-center gap-1">
                          <HiOfficeBuilding className="w-3 h-3" /> {u.company}
                        </span>
                      )}
                      {u.country && (
                        <span className="flex items-center gap-1">
                          {u.country}
                        </span>
                      )}
                    </div>

                    {/* Render creatorTypes */}
                    {u.creatorTypes && u.creatorTypes.length > 0 && (
                      <div className="mt-2 text-xs text-gray-700">
                        <span className="font-semibold">Creator Types:</span>{" "}
                        <ul className="list-disc list-inside ml-2">
                          {u.creatorTypes.map((type, index) => (
                            <li key={index}>{type}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Render otherCreatorType if provided */}
                    {u.otherCreatorType && (
                      <div className="mt-1 text-xs text-gray-700">
                        <span className="font-semibold">Other:</span> {u.otherCreatorType}
                      </div>
                    )}
                  </td>

                  <td className="px-2 py-3 align-top text-xs">
                    <span
                      className={
                        "inline-block px-2 py-1 rounded-full capitalize " +
                        (u.role === "admin"
                          ? "bg-indigo-100 text-indigo-700"
                          : u.role === "clipper"
                            ? "bg-blue-100 text-blue-700"
                            : u.role === "advertiser"
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-gray-200 text-gray-600")
                      }
                    >
                      {roleLabels[u.role] || u.role}
                    </span>
                  </td>
                  <td className="px-2 py-3 align-top text-xs">
                    <div className="flex flex-wrap gap-1 items-center">
                      {u.isVerified && (
                        <span className="inline-flex items-center gap-1 text-green-700 bg-green-100 px-2 py-1 rounded-full text-xs">
                          <HiCheckCircle className="w-3 h-3" /> Verified
                        </span>
                      )}
                      {u.isBlocked && (
                        <span className="inline-flex items-center gap-1 text-red-700 bg-red-100 px-2 py-1 rounded-full text-xs">
                          <HiBan className="w-3 h-3" /> Blocked
                        </span>
                      )}
                      {!u.isVerified && !u.isBlocked && (
                        <span className="inline-flex items-center gap-1 text-yellow-700 bg-yellow-100 px-2 py-1 rounded-full text-xs">
                          Pending
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-2 py-3 align-top text-xs">
                    {new Date(u.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-2 py-3 align-top text-xs">
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => toggleBlock(u._id, !u.isBlocked)}
                        className={
                          "flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold transition " +
                          (u.isBlocked
                            ? "bg-green-600 text-white hover:bg-green-700"
                            : "bg-red-600 text-white hover:bg-red-700")
                        }
                      >
                        {u.isBlocked ? (
                          <>
                            <HiCheckCircle className="w-4 h-4" /> Unban
                          </>
                        ) : (
                          <>
                            <HiBan className="w-4 h-4" /> Ban
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => deleteUser(u._id)}
                        className="flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-gray-200 text-gray-700 hover:bg-gray-300"
                      >
                        <HiUserRemove className="w-4 h-4" /> Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {/* PAGINATION */}
      <div className="flex justify-between items-center mt-6 mb-2 px-1">
        <div className="text-sm text-gray-500">
          Showing {(page - 1) * PAGE_SIZE + 1}-
          {Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length} users
        </div>
        <div className="flex gap-2 items-center">
          <button
            className="px-2 py-1 rounded bg-gray-100 text-xs"
            disabled={page === 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Prev
          </button>
          <span className="text-xs">
            {page} / {totalPages || 1}
          </span>
          <button
            className="px-2 py-1 rounded bg-gray-100 text-xs"
            disabled={page === totalPages || totalPages === 0}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
