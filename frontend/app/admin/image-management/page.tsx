'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useAuthStore } from '@/store/auth'
import { API_ENDPOINTS, getApiBaseUrl } from '@/lib/api'
import axios from 'axios'
import { toast } from 'react-hot-toast'
import { 
  Upload, 
  Trash2, 
  Eye, 
  Download, 
  Search, 
  Filter,
  Image as ImageIcon,
  FileImage,
  FolderOpen,
  RefreshCw,
  Plus,
  X,
  CheckCircle,
  AlertCircle
} from 'lucide-react'

interface ImageFile {
  id: string
  name: string
  path: string
  size: number
  type: string
  uploadedAt: string
  url: string
}

export default function ImageManagement() {
  const { token } = useAuthStore()
  const [images, setImages] = useState<ImageFile[]>([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedImage, setSelectedImage] = useState<ImageFile | null>(null)
  const [showImageModal, setShowImageModal] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [dragActive, setDragActive] = useState(false)

  // Resimleri yükle
  const fetchImages = useCallback(async () => {
    setLoading(true)
    try {
      const headers: any = {}
      if (token) {
        headers.Authorization = `Bearer ${token}`
      }
      
      // Canlı ortamda local resimleri kullan
      const isProduction = typeof window !== 'undefined' && window.location.hostname === 'arsut.net.tr'
      
      if (isProduction) {
        // Canlı ortamda canlı backend'den resimleri al
        try {
          const response = await axios.get('https://yemek5-backend.onrender.com/api/admin/images', {
            headers
          })
          
          // Backend'den gelen veriyi frontend formatına çevir
          const imagesData = response.data.map((img: any) => ({
            id: img.filename,
            name: img.filename,
            path: img.path,
            size: img.size,
            type: img.filename.split('.').pop()?.toUpperCase() || 'UNKNOWN',
            uploadedAt: img.uploadedAt,
            url: `https://yemek5-backend.onrender.com${img.path}`
          }))
          
          setImages(imagesData)
          toast.success(`${imagesData.length} resim yüklendi (Canlı)`)
        } catch (error) {
          console.error('Canlı backend\'den resimler yüklenemedi:', error)
          // Canlı backend'de resim yoksa, varsayılan resimler göster
          const defaultImages = [
            'sanayi-tostu.png', 'fanta.png', 'cocacola.png', 'pepsi.png', 'sprite.png',
            'ayran.png', 'su.png', 'kumru-sandvic.png', 'hamburger.png', 'pizza.png',
            'doner.png', 'kebap.png', 'lahmacun.png', 'pide.png', 'borek.png',
            'patates.png', 'salata.png', 'corba.png', 'pilav.png', 'makarna.png'
          ]
          
          const imagesData = defaultImages.map((filename, index) => ({
            id: filename,
            name: filename,
            path: `/uploads/products/${filename}`,
            size: 466, // Varsayılan boyut
            type: filename.split('.').pop()?.toUpperCase() || 'PNG',
            uploadedAt: new Date().toISOString(),
            url: `https://yemek5-backend.onrender.com/uploads/products/${filename}`
          }))
          
          setImages(imagesData)
          toast.success(`${imagesData.length} varsayılan resim yüklendi`)
        }
      } else {
        // Development ortamında backend'den al
        console.log('🔍 Development ortamında resimler yükleniyor...')
        console.log('🔗 API Endpoint:', API_ENDPOINTS.ADMIN_IMAGES)
        console.log('🔗 API Base URL:', getApiBaseUrl())
        
        const response = await axios.get(API_ENDPOINTS.ADMIN_IMAGES, {
          headers
        })
        
        console.log('📊 Backend response:', response.data)
        
        // Backend'den gelen veriyi frontend formatına çevir
        const imagesData = response.data.map((img: any) => ({
          id: img.filename,
          name: img.filename,
          path: img.path,
          size: img.size,
          type: img.filename.split('.').pop()?.toUpperCase() || 'UNKNOWN',
          uploadedAt: img.uploadedAt,
          url: `${getApiBaseUrl()}${img.path}`
        }))
        
        console.log('📋 Frontend images data:', imagesData)
        
        setImages(imagesData)
        toast.success(`${imagesData.length} resim yüklendi`)
      }
    } catch (error: any) {
      console.error('Resimler yüklenemedi:', error)
      toast.error('Resimler yüklenemedi')
    } finally {
      setLoading(false)
    }
  }, [token])

  // İlk yükleme
  useEffect(() => {
    fetchImages()
  }, [fetchImages])

  // Dosya yükleme
  const handleFileUpload = useCallback(async (files: FileList) => {
    if (!token) return

    setUploading(true)
    setUploadProgress(0)

    try {
      // Canlı ortamda local resimleri kullan
      const isProduction = typeof window !== 'undefined' && window.location.hostname === 'arsut.net.tr'
      
      if (isProduction) {
        // Canlı ortamda canlı backend'e yükle
        for (let i = 0; i < files.length; i++) {
          const file = files[i]
          const formData = new FormData()
          formData.append('image', file)

          const response = await axios.post('https://yemek5-backend.onrender.com/api/admin/upload-image', formData, {
            headers: { 
              Authorization: `Bearer ${token}`,
              'Content-Type': 'multipart/form-data'
            },
            onUploadProgress: (progressEvent) => {
              const progress = Math.round((progressEvent.loaded * 100) / (progressEvent.total || 1))
              setUploadProgress(progress)
            }
          })

          console.log(`${file.name} yüklendi:`, response.data)
        }

        toast.success(`${files.length} resim yüklendi (Canlı)`)
        fetchImages() // Resimleri yeniden yükle
        setUploading(false)
        return
      }

      // Her dosya için ayrı ayrı yükle
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        const formData = new FormData()
        formData.append('image', file)

        const response = await axios.post(API_ENDPOINTS.UPLOAD_IMAGE, formData, {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          },
          onUploadProgress: (progressEvent) => {
            if (progressEvent.total) {
              const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total)
              setUploadProgress(progress)
            }
          }
        })

        if (response.data.imagePath) {
          console.log('Resim yüklendi:', response.data.imagePath)
        }
      }

      toast.success(`${files.length} resim başarıyla yüklendi`)
      fetchImages() // Resimleri yeniden yükle
    } catch (error: any) {
      console.error('Resim yükleme hatası:', error)
      toast.error('Resimler yüklenemedi')
    } finally {
      setUploading(false)
      setUploadProgress(0)
    }
  }, [token, fetchImages])

  // Resim silme
  const handleDeleteImage = useCallback(async (imageId: string) => {
    if (!token) return

    // Canlı ortamda local resimleri kullan
    const isProduction = typeof window !== 'undefined' && window.location.hostname === 'arsut.net.tr'
    
    if (isProduction) {
      // Canlı ortamda canlı backend'den sil
      try {
        const response = await axios.delete(`https://yemek5-backend.onrender.com/api/admin/images/${imageId}`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        
        console.log('Resim silindi:', response.data)
        toast.success('Resim silindi (Canlı)')
        fetchImages() // Resimleri yeniden yükle
      } catch (error: any) {
        console.error('Resim silinemedi:', error)
        toast.error('Resim silinemedi')
      }
      return
    }

    if (!confirm('Bu resmi silmek istediğinizden emin misiniz?')) {
      return
    }

    try {
      await axios.delete(API_ENDPOINTS.DELETE_IMAGE(imageId), {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      setImages(prev => prev.filter(img => img.id !== imageId))
      toast.success('Resim başarıyla silindi')
    } catch (error: any) {
      console.error('Resim silinemedi:', error)
      toast.error('Resim silinemedi')
    }
  }, [token])

  // Resim görüntüleme
  const handleViewImage = useCallback((image: ImageFile) => {
    setSelectedImage(image)
    setShowImageModal(true)
  }, [])

  // Resim indirme
  const handleDownloadImage = useCallback(async (image: ImageFile) => {
    try {
      const response = await fetch(image.url)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = image.name
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      toast.success('Resim indirildi')
    } catch (error) {
      console.error('Resim indirilemedi:', error)
      toast.error('Resim indirilemedi')
    }
  }, [])

  // Drag & Drop handlers
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files)
    }
  }, [handleFileUpload])

  // Filtrelenmiş resimler
  const filteredImages = images.filter(image =>
    image.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Dosya boyutu formatı
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <ImageIcon className="h-8 w-8 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">🖼️ Resim Yönetimi</h1>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={fetchImages}
              disabled={loading}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              <span>Yenile</span>
            </button>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Upload Area */}
        <div className="mb-8">
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200 ${
              dragActive 
                ? 'border-blue-500 bg-blue-50' 
                : 'border-gray-300 hover:border-blue-400 hover:bg-blue-25'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Resimleri buraya sürükleyin veya seçin
            </h3>
            <p className="text-gray-500 mb-4">
              PNG, JPG, JPEG, GIF dosyaları desteklenir (Maksimum 10MB)
            </p>
            
            {uploading && (
              <div className="mb-4">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
                <p className="text-sm text-gray-600 mt-2">Yükleniyor... %{uploadProgress}</p>
              </div>
            )}

            <input
              type="file"
              multiple
              accept="image/*"
              onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
              className="hidden"
              id="file-upload"
              disabled={uploading}
            />
            <label
              htmlFor="file-upload"
              className={`inline-flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-colors cursor-pointer ${
                uploading
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-500 text-white hover:bg-blue-600'
              }`}
            >
              <Plus className="h-4 w-4" />
              <span>{uploading ? 'Yükleniyor...' : 'Resim Seç'}</span>
            </label>
          </div>
        </div>

        {/* Search & Filter */}
        <div className="mb-6">
          <div className="flex items-center space-x-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Resim ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <Filter className="h-4 w-4" />
              <span>{filteredImages.length} / {images.length} resim</span>
            </div>
          </div>
        </div>

        {/* Images Grid */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Resimler yükleniyor...</p>
          </div>
        ) : filteredImages.length === 0 ? (
          <div className="text-center py-12">
            <FileImage className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchTerm ? 'Arama sonucu bulunamadı' : 'Henüz resim yok'}
            </h3>
            <p className="text-gray-500">
              {searchTerm ? 'Farklı bir arama terimi deneyin' : 'İlk resminizi yüklemek için yukarıdaki alanı kullanın'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredImages.map((image) => (
              <div
                key={image.id}
                className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-200"
              >
                {/* Image Preview */}
                <div className="relative aspect-square bg-gray-100">
                  <img
                    src={image.url}
                    alt={image.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement
                      target.src = '/placeholder-image.svg'
                    }}
                  />
                  
                  {/* Overlay Actions */}
                  <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-50 transition-all duration-200 flex items-center justify-center opacity-0 hover:opacity-100">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleViewImage(image)}
                        className="p-2 bg-white rounded-lg shadow-lg hover:bg-gray-50 transition-colors"
                        title="Görüntüle"
                      >
                        <Eye className="h-4 w-4 text-gray-700" />
                      </button>
                      <button
                        onClick={() => handleDownloadImage(image)}
                        className="p-2 bg-white rounded-lg shadow-lg hover:bg-gray-50 transition-colors"
                        title="İndir"
                      >
                        <Download className="h-4 w-4 text-gray-700" />
                      </button>
                      <button
                        onClick={() => handleDeleteImage(image.id)}
                        className="p-2 bg-red-500 text-white rounded-lg shadow-lg hover:bg-red-600 transition-colors"
                        title="Sil"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Image Info */}
                <div className="p-4">
                  <h3 className="font-medium text-gray-900 truncate mb-1" title={image.name}>
                    {image.name}
                  </h3>
                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <span>{formatFileSize(image.size)}</span>
                    <span>{new Date(image.uploadedAt).toLocaleDateString('tr-TR')}</span>
                  </div>
                  <div className="mt-2 flex items-center space-x-2">
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                      {image.type}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Image Modal */}
      {showImageModal && selectedImage && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-4xl max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-medium text-gray-900">{selectedImage.name}</h3>
              <button
                onClick={() => setShowImageModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            
            <div className="p-6">
              <div className="flex items-center justify-center mb-4">
                <img
                  src={selectedImage.url}
                  alt={selectedImage.name}
                  className="max-w-full max-h-96 object-contain rounded-lg"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-700">Dosya Adı:</span>
                  <p className="text-gray-600">{selectedImage.name}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Boyut:</span>
                  <p className="text-gray-600">{formatFileSize(selectedImage.size)}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Tür:</span>
                  <p className="text-gray-600">{selectedImage.type}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Yüklenme Tarihi:</span>
                  <p className="text-gray-600">
                    {new Date(selectedImage.uploadedAt).toLocaleString('tr-TR')}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center justify-end space-x-3 mt-6 pt-4 border-t">
                <button
                  onClick={() => handleDownloadImage(selectedImage)}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                  <Download className="h-4 w-4" />
                  <span>İndir</span>
                </button>
                <button
                  onClick={() => handleDeleteImage(selectedImage.id)}
                  className="flex items-center space-x-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                  <span>Sil</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 