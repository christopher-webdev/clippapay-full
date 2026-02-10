import React, { useEffect, useState } from "react";
import {
  HiSearch,
  HiBan,
  HiCheckCircle,
  HiUserRemove,
  HiMail,
  HiPhone,
  HiOfficeBuilding,
  HiStar,
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
  isPremiumCreator?: boolean;
  createdAt: string;
  creatorTypes?: string[];
  otherCreatorType?: string;
}

const roleLabels: Record<string, string> = {
  clipper: "Clipper",
  advertiser: "Advertiser",
  admin: "Admin",
  "ad-worker": "Ad Worker",
  platform: "Platform",
};

const PAGE_SIZE = 100;

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
  }, []);

  const filtered = users.filter((u) => {
    if (
      search &&
      !(
        u.email?.toLowerCase().includes(search.toLowerCase()) ||
        (u.firstName && u.firstName.toLowerCase().includes(search.toLowerCase())) ||
        (u.lastName && u.lastName.toLowerCase().includes(search.toLowerCase())) ||
        (u.company && u.company.toLowerCase().includes(search.toLowerCase())) ||
        (u.contactName && u.contactName.toLowerCase().includes(search.toLowerCase())) ||
        (u.phone && u.phone.includes(search)) ||
        (u.country && u.country.toLowerCase().includes(search.toLowerCase()))
      )
    ) return false;
    if (role && u.role !== role) return false;
    if (status === "blocked" && !u.isBlocked) return false;
    if (status === "verified" && !u.isVerified) return false;
    if (status === "pending" && (u.isVerified || u.isBlocked)) return false;
    return true;
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const pageUsers = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const toggleSelect = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((sid) => sid !== id) : [...prev, id]
    );
  };

  const selectAllPage = () => {
    setSelected(pageUsers.map((u) => u._id));
  };

  const clearSelection = () => setSelected([]);

  const batchAction = async (
    action: "block" | "unblock" | "delete",
    confirmMsg?: string
  ) => {
    if (selected.length === 0) return;
    if (confirmMsg && !window.confirm(confirmMsg)) return;
    setBatchLoading(true);
    setErr(null);
    try {
      await axios.post(
        `${API_BASE}/user/all`,
        { action, userIds: selected },
        { withCredentials: true }
      );
      fetchUsers();
    } catch (err: any) {
      setErr(err?.response?.data?.error || "Error with batch action");
    } finally {
      setBatchLoading(false);
    }
  };

  const togglePremium = async (userId: string, makePremium: boolean) => {
    const actionText = makePremium ? "Make Premium Creator" : "Remove Premium status";
    if (!window.confirm(`Are you sure you want to ${actionText.toLowerCase()}?`)) return;

    try {
      setErr(null);
      await axios.patch(
        `${API_BASE}/user/${userId}`,
        { isPremiumCreator: makePremium },
        { withCredentials: true }
      );

      setUsers((prev) =>
        prev.map((u) =>
          u._id === userId ? { ...u, isPremiumCreator: makePremium } : u
        )
      );
    } catch (err: any) {
      setErr(err?.response?.data?.error || "Failed to update premium status");
    }
  };

  const toggleBlock = async (id: string, block: boolean) => {
    try {
      await axios.post(
        `${API_BASE}/user/${id}/block`,
        { block },
        { withCredentials: true }
      );
      setUsers((prev) =>
        prev.map((u) => (u._id === id ? { ...u, isBlocked: block } : u))
      );
    } catch (err: any) {
      setErr(err?.response?.data?.error || "Error updating block status");
    }
  };

  const deleteUser = async (id: string) => {
    if (!window.confirm("Delete this user permanently? This cannot be undone.")) return;
    try {
      await axios.delete(`${API_BASE}/user/${id}`, { withCredentials: true });
      setUsers((prev) => prev.filter((u) => u._id !== id));
    } catch (err: any) {
      setErr(err?.response?.data?.error || "Error deleting user");
    }
  };

  return (
    <div className="p-2 md:p-6">
      {/* Filters & Batch Actions */}
      <div className="flex flex-col md:flex-row gap-3 md:gap-6 items-stretch md:items-end mb-4">
        <div className="relative flex-1 md:w-80">
          <input
            type="text"
            placeholder="Search name, email, company…"
            className="w-full rounded-xl border px-4 py-2 pl-10 text-sm focus:ring-2 focus:ring-indigo-500"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
          <HiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
        </div>

        <select
          className="rounded-xl border px-3 py-2 text-sm min-w-[140px]"
          value={role}
          onChange={(e) => { setRole(e.target.value); setPage(1); }}
        >
          <option value="">All Roles</option>
          {Object.entries(roleLabels).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>

        <select
          className="rounded-xl border px-3 py-2 text-sm min-w-[140px]"
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
        >
          <option value="">All Status</option>
          <option value="verified">Verified</option>
          <option value="pending">Pending</option>
          <option value="blocked">Blocked</option>
        </select>

        {selected.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <button
              className="px-3 py-1 rounded-xl text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700"
              onClick={selectAllPage}
            >
              Select Page
            </button>
            <button
              className="px-3 py-1 rounded-xl text-xs font-semibold bg-gray-200 text-gray-700 hover:bg-gray-300"
              onClick={clearSelection}
            >
              Clear
            </button>
            <button
              className="px-3 py-1 rounded-xl text-xs font-semibold bg-red-600 text-white hover:bg-red-700"
              onClick={() => batchAction("block")}
            >
              Ban ({selected.length})
            </button>
            <button
              className="px-3 py-1 rounded-xl text-xs font-semibold bg-green-600 text-white hover:bg-green-700"
              onClick={() => batchAction("unblock")}
            >
              Unban ({selected.length})
            </button>
            <button
              className="px-3 py-1 rounded-xl text-xs font-semibold bg-gray-900 text-white hover:bg-gray-800"
              onClick={() => batchAction("delete", "Delete all selected users permanently?")}
            >
              Delete ({selected.length})
            </button>
          </div>
        )}
      </div>

      {err && <div className="text-red-600 text-sm mb-3">{err}</div>}

      <div className="overflow-x-auto bg-white shadow rounded-xl">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-3">
                <input
                  type="checkbox"
                  checked={pageUsers.length > 0 && pageUsers.every(u => selected.includes(u._id))}
                  onChange={(e) => e.target.checked ? selectAllPage() : clearSelection()}
                  className="w-4 h-4 accent-indigo-600"
                />
              </th>
              <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500">User</th>
              <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500">Role</th>
              <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500">Status</th>
              <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500">Premium</th>
              <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500">Joined</th>
              <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading ? (
              <tr><td colSpan={7} className="py-12 text-center text-gray-500">Loading...</td></tr>
            ) : pageUsers.length === 0 ? (
              <tr><td colSpan={7} className="py-12 text-center text-gray-500">No users found</td></tr>
            ) : (
              pageUsers.map((u) => (
                <tr
                  key={u._id}
                  className={u.isBlocked ? "bg-red-50" : u.isVerified ? "bg-green-50" : ""}
                >
                  <td className="px-3 py-4">
                    <input
                      type="checkbox"
                      checked={selected.includes(u._id)}
                      onChange={() => toggleSelect(u._id)}
                      className="w-4 h-4 accent-indigo-600"
                    />
                  </td>

                  <td className="px-3 py-4">
                    <div className="font-medium text-gray-900">
                      {u.firstName || u.contactName || u.company || "—"} {u.lastName || ""}
                    </div>
                    <div className="text-xs text-gray-600 mt-1 space-y-1">
                      <div><HiMail className="inline w-3.5 h-3.5 mr-1" />{u.email}</div>
                      {u.phone && <div><HiPhone className="inline w-3.5 h-3.5 mr-1" />{u.phone}</div>}
                      {u.company && <div><HiOfficeBuilding className="inline w-3.5 h-3.5 mr-1" />{u.company}</div>}
                      {u.country && <div>{u.country}</div>}
                    </div>

                    {u.creatorTypes?.length > 0 && (
                      <div className="mt-2 text-xs">
                        <span className="font-semibold">Types:</span>{" "}
                        {u.creatorTypes.join(", ")}
                      </div>
                    )}
                    {u.otherCreatorType && (
                      <div className="mt-1 text-xs">
                        <span className="font-semibold">Other:</span> {u.otherCreatorType}
                      </div>
                    )}
                  </td>

                  <td className="px-3 py-4 text-xs">
                    <span className={`inline-block px-2.5 py-1 rounded-full capitalize ${
                      u.role === "admin" ? "bg-indigo-100 text-indigo-700" :
                      u.role === "clipper" ? "bg-blue-100 text-blue-700" :
                      u.role === "advertiser" ? "bg-yellow-100 text-yellow-800" :
                      "bg-gray-200 text-gray-600"
                    }`}>
                      {roleLabels[u.role] || u.role}
                    </span>
                  </td>

                  <td className="px-3 py-4 text-xs">
                    <div className="flex flex-wrap gap-1.5">
                      {u.isVerified && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 text-green-800 text-xs">
                          <HiCheckCircle className="w-3.5 h-3.5" /> Verified
                        </span>
                      )}
                      {u.isBlocked && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 text-red-800 text-xs">
                          <HiBan className="w-3.5 h-3.5" /> Blocked
                        </span>
                      )}
                      {!u.isVerified && !u.isBlocked && (
                        <span className="px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-800 text-xs">
                          Pending
                        </span>
                      )}
                    </div>
                  </td>

                  <td className="px-3 py-4 text-xs">
                    {u.role === "clipper" && (
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                        u.isPremiumCreator
                          ? "bg-purple-100 text-purple-800 border border-purple-200"
                          : "bg-gray-100 text-gray-600"
                      }`}>
                        <HiStar className="w-4 h-4" />
                        {u.isPremiumCreator ? "Premium" : "Standard"}
                      </span>
                    )}
                  </td>

                  <td className="px-3 py-4 text-xs text-gray-600">
                    {new Date(u.createdAt).toLocaleDateString()}
                  </td>

                  <td className="px-3 py-4">
                    <div className="flex flex-col gap-2">
                      {u.role === "clipper" && (
                        <button
                          onClick={() => togglePremium(u._id, !u.isPremiumCreator)}
                          className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                            u.isPremiumCreator
                              ? "bg-purple-600 hover:bg-purple-700 text-white"
                              : "bg-purple-100 hover:bg-purple-200 text-purple-800"
                          }`}
                        >
                          <HiStar className="w-4 h-4" />
                          {u.isPremiumCreator ? "Remove Premium" : "Make Premium"}
                        </button>
                      )}

                      <button
                        onClick={() => toggleBlock(u._id, !u.isBlocked)}
                        className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white transition-colors ${
                          u.isBlocked
                            ? "bg-green-600 hover:bg-green-700"
                            : "bg-red-600 hover:bg-red-700"
                        }`}
                      >
                        {u.isBlocked ? (
                          <> <HiCheckCircle className="w-4 h-4" /> Unban </>
                        ) : (
                          <> <HiBan className="w-4 h-4" /> Ban </>
                        )}
                      </button>

                      <button
                        onClick={() => deleteUser(u._id)}
                        className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-200 hover:bg-gray-300 text-gray-800 transition-colors"
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

      {/* Pagination */}
      <div className="flex flex-col sm:flex-row justify-between items-center mt-6 gap-4 px-1">
        <div className="text-sm text-gray-600">
          Showing {(page - 1) * PAGE_SIZE + 1}–
          {Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length} users
        </div>
        <div className="flex items-center gap-3">
          <button
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm disabled:opacity-50"
            disabled={page === 1}
            onClick={() => setPage(p => Math.max(1, p - 1))}
          >
            Prev
          </button>
          <span className="text-sm font-medium">
            {page} / {totalPages || 1}
          </span>
          <button
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm disabled:opacity-50"
            disabled={page === totalPages || totalPages === 0}
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}