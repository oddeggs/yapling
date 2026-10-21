import { PaywallContainer } from '../../features/plus';

/** `yapling://plus`: the Yapling Plus paywall. The roommate's name comes from the profile once wired. */
export default function PlusRoute() {
  return <PaywallContainer roommateName="Pip" />;
}
