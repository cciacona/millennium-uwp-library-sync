import {
	Millennium,
	definePlugin,
	IconsModule,
} from '@steambrew/client';
import React  from 'react';
import { UWPLibrarySync } from 'ipc';
import SettingsContent from 'SettingsUI';

// setup evemts
Millennium.exposeObj?.({ UWPLibrarySync });

// yeet plugin
export default definePlugin(() => ({
	title: 'UWP & XBOX Library Sync',
	icon: <IconsModule.Settings />,
	content: <SettingsContent />
}));