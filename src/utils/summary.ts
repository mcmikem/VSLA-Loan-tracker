import { Member, VSLAState } from '../types';

/**
 * Paper / feature-phone bridge.
 * One smartphone records; everyone else verifies via paper slip or SMS/WhatsApp.
 * Keep messages < 300 chars so they fit one SMS. No NIN, no sensitive data.
 */

export function buildMeetingSms(state: VSLAState): string {
  const name = state.groupName || 'VSLA';
  const m = state.recentMeetingsCount;
  return (
    `${name} Mtg #${m}: Box UGX ${state.boxCashBalance.toLocaleString()}, ` +
    `Loans UGX ${state.loanFundBalance.toLocaleString()}, ` +
    `Welfare UGX ${state.welfareFundBalance.toLocaleString()}. ` +
    `${state.members.length} members. Paper stamp = proof.`
  ).slice(0, 300);
}

export function buildMemberSms(
  member: Member,
  state: Pick<VSLAState, 'groupName' | 'recentMeetingsCount'>
): string {
  return (
    `${state.groupName || 'VSLA'} #${state.recentMeetingsCount}: ${member.name} (#${member.no}), ` +
    `saved UGX ${member.sharesTotal.toLocaleString()}, ` +
    `loan bal UGX ${member.loanBalance.toLocaleString()}. ` +
    `Check paper passbook.`
  ).slice(0, 300);
}

export function waLink(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

export function smsLink(text: string): string {
  return `sms:?body=${encodeURIComponent(text)}`;
}
