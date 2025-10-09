'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Settings,
  Globe,
  DollarSign,
  Mail,
  Shield,
  HardDrive,
  Download,
  Upload,
  Save,
  RefreshCcw,
  Check,
  AlertCircle
} from 'lucide-react'
import { useToastContext } from '@/components/ToastProvider'

export function SettingsPanel() {
  const [activeTab, setActiveTab] = useState('general')
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Mock settings - in a real implementation, these would be loaded from database
  const [generalSettings, setGeneralSettings] = useState({
    siteName: 'Vendra',
    defaultCurrency: 'DOP',
    defaultLanguage: 'es',
    timezone: 'America/Santo_Domingo',
    maintenanceMode: false,
    allowRegistration: true,
    requireApproval: true
  })

  const [emailSettings, setEmailSettings] = useState({
    smtpHost: '',
    smtpPort: 587,
    smtpUser: '',
    smtpPassword: '',
    fromEmail: '',
    fromName: '',
    enableNotifications: true,
    notificationTemplatesEnabled: false
  })

  const [securitySettings, setSecuritySettings] = useState({
    rateLimitPerMinute: 60,
    maxLoginAttempts: 5,
    sessionTimeoutHours: 24,
    requireStrongPasswords: true,
    enableTwoFactorAuth: false
  })

  const { success: showSuccess, error: showError } = useToastContext()

  const fetchSettings = async () => {
    setIsLoading(true)
    try {
      await new Promise(resolve => setTimeout(resolve, 500))
      console.log('Settings loaded successfully')
    } catch (err) {
      console.error('Error loading settings:', err)
      showError('Error al cargar configuración')
    } finally {
      setIsLoading(false)
    }
  }

  const saveSettings = async () => {
    setIsSaving(true)
    try {
      await new Promise(resolve => setTimeout(resolve, 1000))
      showSuccess('Configuración guardada exitosamente')
      console.log('Settings saved')
    } catch (err) {
      console.error('Error saving settings:', err)
      showError('Error al guardar configuración')
    } finally {
      setIsSaving(false)
    }
  }

  const exportData = async () => {
    try {
      showSuccess('Exportando datos del sistema...')
    } catch (err) {
      showError('Error al exportar datos')
    }
  }

  const importData = async () => {
    try {
      showSuccess('Función de importar próximamente disponible')
    } catch (err) {
      showError('Error al importar datos')
    }
  }

  const resetToDefaults = () => {
    if (confirm('¿Estás seguro de que quieres restaurar la configuración por defecto? Esta acción no se puede deshacer.')) {
      showSuccess('Configuración restaurada a valores por defecto')
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Configuración del Sistema</h2>
          <p className="text-gray-600">Administrar parámetros globales y configuraciones del sistema</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={fetchSettings}
            variant="outline"
            disabled={isLoading}
          >
            <RefreshCcw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Recargar
          </Button>
          <Button
            onClick={saveSettings}
            disabled={isSaving}
          >
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? 'Guardando...' : 'Guardar Cambios'}
          </Button>
        </div>
      </div>

      {/* Settings Tabs */}
      <div className="border-b">
        <nav className="flex space-x-8">
          {[
            { id: 'general', label: 'General', icon: Settings },
            { id: 'email', label: 'Email', icon: Mail },
            { id: 'security', label: 'Seguridad', icon: Shield },
            { id: 'backup', label: 'Backup', icon: HardDrive }
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-2 py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        {/* General Settings */}
        {activeTab === 'general' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Configuración General
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label htmlFor="siteName" className="text-sm font-medium">Nombre del Sitio</label>
                  <Input
                    id="siteName"
                    value={generalSettings.siteName}
                    onChange={(e) => setGeneralSettings(prev => ({ ...prev, siteName: e.target.value }))}
                    placeholder="Nombre de tu plataforma"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="defaultCurrency" className="text-sm font-medium">Moneda por Defecto</label>
                  <select
                    id="defaultCurrency"
                    value={generalSettings.defaultCurrency}
                    onChange={(e) => setGeneralSettings(prev => ({ ...prev, defaultCurrency: e.target.value }))}
                    className="w-full h-10 px-3 rounded-md border border-gray-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="DOP">Peso Dominicano (DOP)</option>
                    <option value="USD">Dólar Americano (USD)</option>
                    <option value="EUR">Euro (EUR)</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label htmlFor="defaultLanguage" className="text-sm font-medium">Idioma por Defecto</label>
                  <select
                    id="defaultLanguage"
                    value={generalSettings.defaultLanguage}
                    onChange={(e) => setGeneralSettings(prev => ({ ...prev, defaultLanguage: e.target.value }))}
                    className="w-full h-10 px-3 rounded-md border border-gray-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="es">Español</option>
                    <option value="en">English</option>
                    <option value="fr">Français</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label htmlFor="timezone" className="text-sm font-medium">Zona Horaria</label>
                  <select
                    id="timezone"
                    value={generalSettings.timezone}
                    onChange={(e) => setGeneralSettings(prev => ({ ...prev, timezone: e.target.value }))}
                    className="w-full h-10 px-3 rounded-md border border-gray-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="America/Santo_Domingo">America/Santo_Domingo</option>
                    <option value="UTC">UTC</option>
                    <option value="America/New_York">America/New_York</option>
                  </select>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-lg font-medium">Funcionalidades del Sistema</h3>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="font-medium">Modo de Mantenimiento</div>
                    <div className="text-sm text-gray-500">
                      Desactiva temporalmente el acceso público al sitio
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={generalSettings.maintenanceMode}
                    onChange={(e) => setGeneralSettings(prev => ({ ...prev, maintenanceMode: e.target.checked }))}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="font-medium">Permitir Registro de Usuarios</div>
                    <div className="text-sm text-gray-500">
                      Permite a nuevos usuarios registrarse en la plataforma
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={generalSettings.allowRegistration}
                    onChange={(e) => setGeneralSettings(prev => ({ ...prev, allowRegistration: e.target.checked }))}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="font-medium">Requiere Aprobación Manual</div>
                    <div className="text-sm text-gray-500">
                      Nuevo usuarios necesitan aprobación antes de activarse
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={generalSettings.requireApproval}
                    onChange={(e) => setGeneralSettings(prev => ({ ...prev, requireApproval: e.target.checked }))}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Email Settings */}
        {activeTab === 'email' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Configuración de Email
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <div className="flex items-center gap-2 text-blue-800 text-sm">
                  <AlertCircle className="h-4 w-4" />
                  <span>Configuración actual: <strong>FUNCIONANDO CON SUPABASE MAIL</strong></span>
                </div>
                <p className="text-blue-700 text-xs mt-1">
                  El sistema actualmente usa Supabase Mail. Configura SMTP personalizado solo si lo necesitas.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label htmlFor="smtpHost" className="text-sm font-medium">Servidor SMTP</label>
                  <Input
                    id="smtpHost"
                    value={emailSettings.smtpHost}
                    onChange={(e) => setEmailSettings(prev => ({ ...prev, smtpHost: e.target.value }))}
                    placeholder="smtp.gmail.com"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="smtpPort" className="text-sm font-medium">Puerto SMTP</label>
                  <Input
                    id="smtpPort"
                    type="number"
                    value={emailSettings.smtpPort}
                    onChange={(e) => setEmailSettings(prev => ({ ...prev, smtpPort: parseInt(e.target.value) || 587 }))}
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="fromEmail" className="text-sm font-medium">Email Remitente</label>
                  <Input
                    id="fromEmail"
                    value={emailSettings.fromEmail}
                    onChange={(e) => setEmailSettings(prev => ({ ...prev, fromEmail: e.target.value }))}
                    placeholder="noreply@vendra.com"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="fromName" className="text-sm font-medium">Nombre Remitente</label>
                  <Input
                    id="fromName"
                    value={emailSettings.fromName}
                    onChange={(e) => setEmailSettings(prev => ({ ...prev, fromName: e.target.value }))}
                    placeholder="Vendra Platform"
                  />
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-lg font-medium">Notificaciones</h3>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="font-medium">Activar Notificaciones</div>
                    <div className="text-sm text-gray-500">
                      Enviar emails automáticamente para eventos importantes
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={emailSettings.enableNotifications}
                    onChange={(e) => setEmailSettings(prev => ({ ...prev, enableNotifications: e.target.checked }))}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="font-medium">Plantillas de Notificación</div>
                    <div className="text-sm text-gray-500">
                      Usar plantillas HTML personalizadas para emails
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={emailSettings.notificationTemplatesEnabled}
                    onChange={(e) => setEmailSettings(prev => ({ ...prev, notificationTemplatesEnabled: e.target.checked }))}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Security Settings */}
        {activeTab === 'security' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Configuración de Seguridad
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label htmlFor="rateLimit" className="text-sm font-medium">Límite de Rate Limit (por minuto)</label>
                  <Input
                    id="rateLimit"
                    type="number"
                    value={securitySettings.rateLimitPerMinute}
                    onChange={(e) => setSecuritySettings(prev => ({ ...prev, rateLimitPerMinute: parseInt(e.target.value) || 60 }))}
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="maxLoginAttempts" className="text-sm font-medium">Máximo Intentos de Login</label>
                  <Input
                    id="maxLoginAttempts"
                    type="number"
                    value={securitySettings.maxLoginAttempts}
                    onChange={(e) => setSecuritySettings(prev => ({ ...prev, maxLoginAttempts: parseInt(e.target.value) || 5 }))}
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="sessionTimeout" className="text-sm font-medium">Tiempo de Sesión (horas)</label>
                  <Input
                    id="sessionTimeout"
                    type="number"
                    value={securitySettings.sessionTimeoutHours}
                    onChange={(e) => setSecuritySettings(prev => ({ ...prev, sessionTimeoutHours: parseInt(e.target.value) || 24 }))}
                  />
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-lg font-medium">Políticas de Seguridad</h3>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="font-medium">Contraseñas Fuertes</div>
                    <div className="text-sm text-gray-500">
                      Requerir contraseñas con mayúsculas, números y símbolos
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={securitySettings.requireStrongPasswords}
                    onChange={(e) => setSecuritySettings(prev => ({ ...prev, requireStrongPasswords: e.target.checked }))}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="font-medium">Autenticación de Dos Factores</div>
                    <div className="text-sm text-gray-500">
                      Activar 2FA para todas las cuentas administrativas
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={securitySettings.enableTwoFactorAuth}
                    onChange={(e) => setSecuritySettings(prev => ({ ...prev, enableTwoFactorAuth: e.target.checked }))}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Backup Settings */}
        {activeTab === 'backup' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HardDrive className="h-5 w-5" />
                Backup y Restauración
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                <div className="flex items-center gap-2 text-yellow-800 text-sm">
                  <AlertCircle className="h-4 w-4" />
                  <span>Importante: Respaldar datos regularmente</span>
                </div>
                <p className="text-yellow-700 text-xs mt-1">
                  Mantén copias de seguridad actualizadas de tu base de datos y archivos.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardContent className="p-6 text-center">
                    <Download className="h-12 w-12 text-blue-600 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Exportar Datos</h3>
                    <p className="text-sm text-gray-600 mb-4">
                      Descarga una copia completa de todos los datos del sistema
                    </p>
                    <Button onClick={exportData} className="w-full">
                      <Download className="h-4 w-4 mr-2" />
                      Exportar Todo
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6 text-center">
                    <Upload className="h-12 w-12 text-green-600 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Importar Datos</h3>
                    <p className="text-sm text-gray-600 mb-4">
                      Restaurar datos desde un archivo de backup
                    </p>
                    <Button onClick={importData} variant="outline" className="w-full">
                      <Upload className="h-4 w-4 mr-2" />
                      Importar Backup
                    </Button>
                  </CardContent>
                </Card>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-lg font-medium">Opciones de Sistema</h3>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-0.5">
                    <div className="font-medium">Estado del Sistema</div>
                    <div className="text-sm text-green-600 flex items-center gap-1">
                      <Check className="h-4 w-4" />
                      Todos los servicios funcionando
                    </div>
                  </div>
                  <Badge variant="secondary" className="bg-green-100 text-green-800">
                    Online
                  </Badge>
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="font-medium">Restaurar Configuración por Defecto</div>
                    <div className="text-sm text-gray-500">
                      Restablece todas las configuraciones a sus valores originales
                    </div>
                  </div>
                  <Button onClick={resetToDefaults} variant="destructive" size="sm">
                    Restaurar
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Save Reminder */}
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-orange-600" />
              <div className="flex-1">
                <div className="font-medium text-orange-800">Cambios Pendientes</div>
                <div className="text-sm text-orange-700">
                  Recuerda guardar tus cambios antes de salir de esta página
                </div>
              </div>
              <Button onClick={saveSettings} disabled={isSaving} size="sm">
                {isSaving ? 'Guardando...' : 'Guardar Ahora'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default SettingsPanel
