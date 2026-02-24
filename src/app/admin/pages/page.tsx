import Link from "next/link";
import { listPages } from "@/lib/actions/pages";

export default async function AdminPagesPage() {
  const pages = await listPages();

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Pages</h1>
        <Link
          href="/admin/pages/new"
          className="rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
        >
          New Page
        </Link>
      </div>

      {pages.length === 0 ? (
        <p className="text-gray-500">No pages yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left font-medium text-gray-500">Title</th>
                <th className="px-4 py-2 text-left font-medium text-gray-500">Slug</th>
                <th className="px-4 py-2 text-left font-medium text-gray-500">Status</th>
                <th className="px-4 py-2 text-left font-medium text-gray-500">Order</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {pages.map((page) => (
                <tr key={page.id}>
                  <td className="px-4 py-2 font-medium">{page.title}</td>
                  <td className="px-4 py-2 text-gray-500">/pages/{page.slug}</td>
                  <td className="px-4 py-2">
                    <span
                      className={`rounded px-2 py-0.5 text-xs ${
                        page.published
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {page.published ? "Published" : "Draft"}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-gray-500">{page.sortOrder}</td>
                  <td className="px-4 py-2">
                    <Link
                      href={`/admin/pages/${page.id}/edit`}
                      className="text-blue-600 hover:underline"
                    >
                      Edit
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
