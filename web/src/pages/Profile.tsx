import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { useAuth } from '../contexts/AuthContext'
import { UserCircleIcon } from '@heroicons/react/24/solid'

export function Profile() {
  const { user, profile, refreshProfile } = useAuth()
  const [loading, setLoading] = useState(false)
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '')
      setPhone(profile.phone || '')
      if (profile.avatar_url) downloadImage(profile.avatar_url)
    }
  }, [profile])

  const downloadImage = async (path: string) => {
    try {
      const { data, error } = await supabase.storage.from('avatars').download(path)
      if (error) throw error
      const url = URL.createObjectURL(data)
      setAvatarUrl(url)
    } catch (error) {
      console.error('Error downloading image: ', error)
    }
  }

  const uploadAvatar = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true)
      if (!event.target.files || event.target.files.length === 0) {
        throw new Error('You must select an image to upload.')
      }

      const file = event.target.files[0]
      const fileExt = file.name.split('.').pop()
      const fileName = `${user?.id}-${Math.random()}.${fileExt}`
      const filePath = `${fileName}`

      const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file)

      if (uploadError) throw uploadError

      await updateProfile({ avatar_url: filePath })
      
      // Update local view
      const { data } = await supabase.storage.from('avatars').download(filePath)
      if (data) setAvatarUrl(URL.createObjectURL(data))
      
    } catch (error) {
      alert((error as Error).message)
    } finally {
      setUploading(false)
    }
  }

  const updateProfile = async (updates: { full_name?: string; phone?: string; avatar_url?: string }) => {
    try {
      setLoading(true)
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user?.id)

      if (error) throw error
      refreshProfile() 
      alert('Perfil atualizado!')
    } catch (error) {
      alert((error as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    updateProfile({ full_name: fullName, phone })
  }

  return (
    <div className="max-w-xl mx-auto py-10">
      <h1 className="text-2xl font-bold mb-6 dark:text-white">Meu Perfil</h1>
      
      <div className="bg-white dark:bg-gray-800 shadow sm:rounded-lg p-6">
        <div className="flex flex-col items-center mb-6">
          <div className="relative mb-4">
             {avatarUrl ? (
               <img src={avatarUrl} alt="Avatar" className="h-32 w-32 rounded-full object-cover" />
             ) : (
                <UserCircleIcon className="h-32 w-32 text-gray-300 dark:text-gray-600" aria-hidden="true" />
             )}
             <label htmlFor="avatar-upload" className="absolute bottom-0 right-0 bg-indigo-600 rounded-full p-2 cursor-pointer shadow-lg hover:bg-indigo-500">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-white">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
                </svg>
             </label>
             <input 
                id="avatar-upload" 
                type="file" 
                accept="image/*" 
                onChange={uploadAvatar} 
                disabled={uploading}
                className="hidden" 
             />
          </div>
          {uploading && <p className="text-sm text-gray-500 dark:text-gray-400">Enviando foto...</p>}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
            <input type="text" disabled value={user?.email || ''} className="mt-1 block w-full rounded-md border-gray-300 bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-400 shadow-sm border p-2 text-gray-500" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Nome Completo</label>
            <input 
               type="text" 
               value={fullName} 
               onChange={(e) => setFullName(e.target.value)} 
               className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white" 
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Telefone</label>
            <input 
               type="text" 
               value={phone} 
               onChange={(e) => setPhone(e.target.value)} 
               placeholder="(99) 99999-9999"
               className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white" 
            />
          </div>

          <button 
             type="submit" 
             disabled={loading}
             className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
             {loading ? 'Salvando...' : 'Salvar Perfil'}
          </button>
        </form>
      </div>
    </div>
  )
}
