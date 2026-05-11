import { Container } from '../../shared/ui/layout/Container'
import { PageLayout } from '../../shared/ui/layout/PageLayout'
import { Card } from '../../shared/ui/Card/Card'
import { Text } from '../../shared/ui/Typography/Typography'
import {
  useTheme,
  MODE_OPTIONS,
  LIGHT_VARIANT_OPTIONS,
  DARK_VARIANT_OPTIONS,
  type ThemeMode,
  type LightVariant,
  type DarkVariant,
  type ResolvedTheme,
} from '../../shared/design/ThemeProvider'
import { useLogout } from '../../features/auth/model/useLogout'
import styles from './SettingsPage.module.css'

export function SettingsPage() {
  const { settings, resolved, setMode, setLightVariant, setDarkVariant } = useTheme()
  const logout = useLogout()

  const showLightVariants = settings.mode === 'light' || settings.mode === 'system'
  const showDarkVariants  = settings.mode === 'dark'  || settings.mode === 'system'

  return (
    <PageLayout>
      <Container as="main">
        <div className={styles.content}>
          <header className={styles.heading}>
            <Text variant="title" as="h1" className={styles.title}>Settings</Text>
            <Text variant="body" color="secondary" as="p">
              Choose your atmosphere. Changes apply immediately and persist on this device.
            </Text>
          </header>

          {/* Theme Mode */}
          <Card padding="lg" className={styles.section}>
            <div className={styles.sectionHeader}>
              <Text variant="label" as="h2" className={styles.sectionTitle}>Theme mode</Text>
              <Text variant="caption" color="secondary" as="p">
                System follows your operating system's preference.
              </Text>
            </div>
            <div className={styles.modeGrid}>
              {MODE_OPTIONS.map((opt) => (
                <ModeTile
                  key={opt.value}
                  value={opt.value}
                  label={opt.label}
                  icon={opt.icon}
                  active={settings.mode === opt.value}
                  onClick={() => setMode(opt.value)}
                />
              ))}
            </div>
          </Card>

          {/* Light variants */}
          {showLightVariants && (
            <Card variant="floating" padding="lg" className={styles.section}>
              <div className={styles.sectionHeader}>
                <Text variant="label" as="h2" className={styles.sectionTitle}>Light palette</Text>
                <Text variant="caption" color="secondary" as="p">
                  Used when {settings.mode === 'system' ? 'your system is in light mode' : 'Light is selected above'}.
                </Text>
              </div>
              <div className={styles.variantList}>
                {LIGHT_VARIANT_OPTIONS.map((opt) => (
                  <VariantTile
                    key={opt.value}
                    label={opt.label}
                    description={opt.description}
                    active={settings.lightVariant === opt.value}
                    swatch={opt.swatch}
                    onClick={() => setLightVariant(opt.value as LightVariant)}
                  />
                ))}
              </div>
            </Card>
          )}

          {/* Dark variants */}
          {showDarkVariants && (
            <Card variant="floating" padding="lg" className={styles.section}>
              <div className={styles.sectionHeader}>
                <Text variant="label" as="h2" className={styles.sectionTitle}>Dark palette</Text>
                <Text variant="caption" color="secondary" as="p">
                  Used when {settings.mode === 'system' ? 'your system is in dark mode' : 'Dark is selected above'}.
                </Text>
              </div>
              <div className={styles.variantList}>
                {DARK_VARIANT_OPTIONS.map((opt) => (
                  <VariantTile
                    key={opt.value}
                    label={opt.label}
                    description={opt.description}
                    active={settings.darkVariant === opt.value}
                    swatch={opt.swatch}
                    onClick={() => setDarkVariant(opt.value as DarkVariant)}
                  />
                ))}
              </div>
            </Card>
          )}

          <Text variant="caption" color="secondary" as="p" className={styles.footnote}>
            Currently active: <strong>{resolved}</strong>
          </Text>

          {/* ── Account ─────────────────────────────────────────────────────
              Logout is accessible here on all screen sizes.
              On mobile it is the primary logout path (not in the top bar).
              On desktop it duplicates the header button for discoverability.
          ─────────────────────────────────────────────────────────────────── */}
          <Card padding="lg" className={styles.section}>
            <div className={styles.sectionHeader}>
              <Text variant="label" as="h2" className={styles.sectionTitle}>Account</Text>
              <Text variant="caption" color="secondary" as="p">
                Sign out of Lexis on this device.
              </Text>
            </div>
            <button
              type="button"
              onClick={logout}
              className={styles.logoutBtn}
            >
              Log out
            </button>
          </Card>
        </div>
      </Container>
    </PageLayout>
  )
}

// ── Tiles ─────────────────────────────────────────────────────────────────────

function ModeTile({
  value, label, icon, active, onClick,
}: {
  value: ThemeMode
  label: string
  icon: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      data-mode={value}
      onClick={onClick}
      className={[styles.modeTile, active ? styles.modeTileActive : ''].join(' ')}
    >
      <span className={styles.modeIcon} aria-hidden>{icon}</span>
      <span className={styles.modeLabel}>{label}</span>
      {active && <span className={styles.check} aria-hidden>✓</span>}
    </button>
  )
}

function VariantTile({
  label, description, active, swatch, onClick,
}: {
  label: string
  description: string
  active: boolean
  swatch: ResolvedTheme
  onClick: () => void
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      onClick={onClick}
      className={[styles.variantTile, active ? styles.variantTileActive : ''].join(' ')}
    >
      <span className={[styles.swatch, styles[`swatch_${swatch}`]].join(' ')} aria-hidden />
      <span className={styles.variantBody}>
        <span className={styles.variantLabel}>{label}</span>
        <span className={styles.variantDesc}>{description}</span>
      </span>
      {active && <span className={styles.check} aria-hidden>✓</span>}
    </button>
  )
}
