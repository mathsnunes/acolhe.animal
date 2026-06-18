import { SettingsTabs } from './components/settings-tabs';

interface Props {
  children: React.ReactNode;
}

const SettingsLayout = ({ children }: Props) => {
  return (
    <div className="mx-auto max-w-2xl py-6">
      <div className="mb-6">
        <div className="eyebrow-mute mb-1">— Organização</div>
        <h1 className="display text-3xl">Configurações</h1>
      </div>
      <SettingsTabs />
      {children}
    </div>
  );
};

export default SettingsLayout;
