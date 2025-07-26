import React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Settings as SettingsIcon, User, Globe, Palette } from "lucide-react"

import Settings from "@/components/Settings"

const NewSettings = () => {
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-foreground">Einstellungen</h1>
        <p className="text-muted-foreground">Passen Sie Ihre App-Einstellungen an</p>
      </div>

      {/* Settings */}
      <Card className="gradient-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <SettingsIcon className="h-5 w-5 text-primary" />
            App-Einstellungen
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <SettingsIcon className="h-12 w-12 text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Einstellungen werden hier angezeigt</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default NewSettings