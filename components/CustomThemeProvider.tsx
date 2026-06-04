import React from 'react';
import { HubSettings } from '@/lib/settings';

export default function CustomThemeProvider({ settings }: { settings: HubSettings }) {
  return (
    <style dangerouslySetInnerHTML={{ __html: `
      :root {
        --primary-color: ${settings.primary_color};
        --secondary-color: ${settings.secondary_color};
        --background-color: ${settings.background_color};
        --text-color: ${settings.text_color};
      }
    ` }} />
  );
}
