'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { getAllUsersWithRoles, getAllRoles, assignRole, removeRole } from '@/lib/roles'
import type { Profile, Role } from '@/lib/supabase'

type UserWithRoles = Profile & { roles: Role[] }

export default function UsersPage() {
  const router = useRouter()
  const { user, isAdmin, loading: authLoading } = useAuth()
  const [users, setUsers] = useState<UserWithRoles[]>([])
  const [allRoles, setAllRoles] = useState<Role[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) {
      router.push('/')
    }
  }, [user, isAdmin, authLoading, router])

  useEffect(() => {
    if (user && isAdmin) {
      loadData()
    }
  }, [user, isAdmin])

  const loadData = async () => {
    setLoading(true)
    setError(null)
    try {
      const [usersData, rolesData] = await Promise.all([
        getAllUsersWithRoles(),
        getAllRoles()
      ])
      setUsers(usersData)
      setAllRoles(rolesData)
    } catch (err) {
      setError('Failed to load users and roles')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleAssignRole = async (userId: string, roleId: string) => {
    const result = await assignRole(userId, roleId, user?.id)
    if (result.success) {
      await loadData()
    } else {
      setError(result.error || 'Failed to assign role')
    }
  }

  const handleRemoveRole = async (userId: string, roleId: string) => {
    const result = await removeRole(userId, roleId)
    if (result.success) {
      await loadData()
    } else {
      setError(result.error || 'Failed to remove role')
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-6xl mx-auto">
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user || !isAdmin) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">User Management</h1>
          <p className="text-gray-600">Manage user roles and permissions</p>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Roles
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Joined
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map((userItem) => (
                <tr key={userItem.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{userItem.email}</div>
                    <div className="text-xs text-gray-500 font-mono">{userItem.id.slice(0, 8)}...</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-2">
                      {userItem.roles.map((role) => (
                        <span
                          key={role.id}
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            role.id === 'admin'
                              ? 'bg-red-100 text-red-800'
                              : role.id === 'moderator'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {role.name}
                          <button
                            onClick={() => handleRemoveRole(userItem.id, role.id)}
                            className="ml-1 hover:text-red-600"
                            title="Remove role"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <select
                      onChange={(e) => {
                        if (e.target.value) {
                          handleAssignRole(userItem.id, e.target.value)
                          e.target.value = ''
                        }
                      }}
                      className="border border-gray-300 rounded px-2 py-1 text-sm"
                      defaultValue=""
                    >
                      <option value="" disabled>
                        Add role...
                      </option>
                      {allRoles
                        .filter((role) => !userItem.roles.some((ur) => ur.id === role.id))
                        .map((role) => (
                          <option key={role.id} value={role.id}>
                            {role.name}
                          </option>
                        ))}
                    </select>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(userItem.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {users.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No users found
            </div>
          )}
        </div>

        <div className="mt-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Available Roles</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {allRoles.map((role) => (
              <div key={role.id} className="bg-white rounded-lg shadow p-4">
                <h3 className="font-semibold text-gray-900 mb-1">{role.name}</h3>
                <p className="text-sm text-gray-600">{role.description}</p>
                <span className="text-xs text-gray-400 mt-2 inline-block">ID: {role.id}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-8 flex gap-4">
          <button
            onClick={() => router.push('/admin')}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
          >
            ← Back to Admin
          </button>
        </div>
      </div>
    </div>
  )
}
