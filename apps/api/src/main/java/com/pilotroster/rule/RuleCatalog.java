package com.pilotroster.rule;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;

@Entity
@Table(name = "rule_catalog")
public class RuleCatalog {

    @Id
    private Long id;

    @Column(name = "rule_id", nullable = false)
    private String ruleId;

    @Column(name = "title_zh", nullable = false)
    private String titleZh;

    @Column(name = "title_en", nullable = false)
    private String titleEn;

    @Column(name = "rule_category", nullable = false)
    private String ruleCategory;

    @Column(name = "severity_default", nullable = false)
    private String severityDefault;

    @Column(name = "source_section", nullable = false)
    private String sourceSection;

    @Column(name = "source_clause", nullable = false)
    private String sourceClause;

    @Column(name = "source_page", nullable = false)
    private Integer sourcePage;

    @Column(name = "phase_code", nullable = false)
    private String phaseCode;

    @Column(name = "active_flag", nullable = false)
    private Boolean activeFlag;

    @Column(name = "applicability", nullable = false)
    private String applicability;

    @Column(name = "description_zh", nullable = false)
    private String descriptionZh;

    @Column(name = "description_en", nullable = false)
    private String descriptionEn;

    @Column(name = "trigger_summary_zh", nullable = false)
    private String triggerSummaryZh;

    @Column(name = "trigger_summary_en", nullable = false)
    private String triggerSummaryEn;

    @Column(name = "handling_method_zh", nullable = false)
    private String handlingMethodZh;

    @Column(name = "handling_method_en", nullable = false)
    private String handlingMethodEn;

    @Column(name = "exception_allowed", nullable = false)
    private Boolean exceptionAllowed;

    @Column(name = "pdf_deeplink")
    private String pdfDeeplink;

    @Column(name = "version_status", nullable = false)
    private String versionStatus;

    @Column(name = "catalog_entry_type", nullable = false)
    private String catalogEntryType;

    @Column(name = "display_rule_code")
    private String displayRuleCode;

    @Column(name = "source_rule_ids")
    private String sourceRuleIds;

    @Column(name = "effective_from_utc")
    private Instant effectiveFromUtc;

    @Column(name = "effective_to_utc")
    private Instant effectiveToUtc;

    public Long getId() {
        return id;
    }

    public String getRuleId() {
        return ruleId;
    }

    public String getTitleZh() {
        return titleZh;
    }

    public String getTitleEn() {
        return titleEn;
    }

    public String getRuleCategory() {
        return ruleCategory;
    }

    public String getSeverityDefault() {
        return severityDefault;
    }

    public String getSourceSection() {
        return sourceSection;
    }

    public String getSourceClause() {
        return sourceClause;
    }

    public Integer getSourcePage() {
        return sourcePage;
    }

    public String getPhaseCode() {
        return phaseCode;
    }

    public Boolean getActiveFlag() {
        return activeFlag;
    }

    public void setActiveFlag(Boolean activeFlag) {
        this.activeFlag = activeFlag;
    }

    public String getApplicability() {
        return applicability;
    }

    public String getDescriptionZh() {
        return descriptionZh;
    }

    public String getDescriptionEn() {
        return descriptionEn;
    }

    public String getTriggerSummaryZh() {
        return triggerSummaryZh;
    }

    public String getTriggerSummaryEn() {
        return triggerSummaryEn;
    }

    public String getHandlingMethodZh() {
        return handlingMethodZh;
    }

    public String getHandlingMethodEn() {
        return handlingMethodEn;
    }

    public Boolean getExceptionAllowed() {
        return exceptionAllowed;
    }

    public String getPdfDeeplink() {
        return pdfDeeplink;
    }

    public String getVersionStatus() {
        return versionStatus;
    }

    public String getCatalogEntryType() {
        return catalogEntryType;
    }

    public String getDisplayRuleCode() {
        return displayRuleCode;
    }

    public String getSourceRuleIds() {
        return sourceRuleIds;
    }

    public Instant getEffectiveFromUtc() {
        return effectiveFromUtc;
    }

    public Instant getEffectiveToUtc() {
        return effectiveToUtc;
    }
}
