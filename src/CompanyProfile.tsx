import { Landmark, FileCheck2, ShieldCheck, BadgeCheck, ArrowUpRight } from 'lucide-react';
import { COMPANY_PROFILE as company } from '../shared/company';

export function CompanyProfile() {
  return <section id="company" className="section container transparency reveal">
    <div className="section-heading split-heading">
      <div><h2>Behind your gold.</h2></div>
      <p>Company identity, registration references and the evidence behind the platform.</p>
    </div>
    <div className="document-grid company-profile">
      <article className="document-card">
        <div className="document-top"><Landmark size={29}/></div>
        <h3>{company.legalName}</h3>
        <dl><div><dt>Operating location</dt><dd>{company.city}, {company.country}</dd></div>
          <div><dt>Registered office</dt><dd>{company.registeredOffice}</dd></div></dl>
        <span className="document-status">Company details supplied by GoldSwap</span>
      </article>
      <article className="document-card">
        <div className="document-top"><FileCheck2 size={29}/></div>
        <h3>Registration references</h3>
        <dl><div><dt>Trade licence</dt><dd>{company.licenceNumber}</dd></div>
          <div><dt>Legal Entity Identifier</dt><dd>{company.lei}</dd></div>
          <div><dt>LEI registration</dt><dd>Lapsed · checked {company.checkedOn}</dd></div></dl>
        <a className="text-link" href={company.registryPageUrl} target="_blank" rel="noreferrer">View GLEIF record <ArrowUpRight size={16}/></a>
        <p>Entity status is active in the registry. LEI renewal status is separate from trade licence validity.</p>
      </article>
      <article className="document-card">
        <div className="document-top"><ShieldCheck size={29}/></div>
        <h3>Gold &amp; custody</h3>
        <div className="company-verification">
          <span className="company-verification-badge"><BadgeCheck size={18} aria-hidden="true"/>{company.custodyAttestation.label}</span>
          <p>{company.custodyAttestation.scope}</p>
        </div>
        <p>{company.custodyAttestation.ownership}</p>
        <p>GoldSwap reports that custody and backing records are maintained privately for confidentiality.</p>
      </article>
    </div>
  </section>;
}
