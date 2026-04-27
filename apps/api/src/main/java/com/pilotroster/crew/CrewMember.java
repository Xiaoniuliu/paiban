package com.pilotroster.crew;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;

@Entity
@Table(name = "crew_member")
public class CrewMember {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "crew_code", nullable = false, length = 64)
    private String crewCode;

    @Column(name = "employee_no", nullable = false, length = 50)
    private String employeeNo;

    @Column(name = "name_zh", nullable = false)
    private String nameZh;

    @Column(name = "name_en", nullable = false)
    private String nameEn;

    @Column(name = "role_code", nullable = false, length = 64)
    private String roleCode;

    @Column(name = "rank_code", nullable = false, length = 50)
    private String rankCode;

    @Column(name = "home_base", nullable = false, length = 3)
    private String homeBase;

    @Column(name = "aircraft_qualification", nullable = false, length = 64)
    private String aircraftQualification;

    @Column(name = "acclimatization_status", nullable = false, length = 64)
    private String acclimatizationStatus;

    @Column(name = "body_clock_timezone", nullable = false, length = 64)
    private String bodyClockTimezone;

    @Column(name = "normal_commute_minutes", nullable = false)
    private Integer normalCommuteMinutes;

    @Column(name = "external_employment_flag", nullable = false, columnDefinition = "TINYINT(1)")
    private Boolean externalEmploymentFlag;

    @Column(name = "availability_status", nullable = false, length = 30)
    private String availabilityStatus;

    @Column(nullable = false, length = 20)
    private String status;

    @Column(name = "rolling_flight_hours_28d", nullable = false)
    private BigDecimal rollingFlightHours28d;

    @Column(name = "rolling_duty_hours_28d", nullable = false)
    private BigDecimal rollingDutyHours28d;

    @Column(name = "rolling_duty_hours_7d", nullable = false)
    private BigDecimal rollingDutyHours7d;

    @Column(name = "rolling_duty_hours_14d", nullable = false)
    private BigDecimal rollingDutyHours14d;

    @Column(name = "rolling_flight_hours_12m", nullable = false)
    private BigDecimal rollingFlightHours12m;

    @Column(name = "latest_actual_fdp_hours")
    private BigDecimal latestActualFdpHours;

    @Column(name = "latest_actual_fdp_source", nullable = false)
    private String latestActualFdpSource;

    public Long getId() {
        return id;
    }

    public String getCrewCode() {
        return crewCode;
    }

    public void setCrewCode(String crewCode) {
        this.crewCode = crewCode;
    }

    public String getEmployeeNo() {
        return employeeNo;
    }

    public void setEmployeeNo(String employeeNo) {
        this.employeeNo = employeeNo;
    }

    public String getNameZh() {
        return nameZh;
    }

    public void setNameZh(String nameZh) {
        this.nameZh = nameZh;
    }

    public String getNameEn() {
        return nameEn;
    }

    public void setNameEn(String nameEn) {
        this.nameEn = nameEn;
    }

    public String getRoleCode() {
        return roleCode;
    }

    public void setRoleCode(String roleCode) {
        this.roleCode = roleCode;
    }

    public String getRankCode() {
        return rankCode;
    }

    public void setRankCode(String rankCode) {
        this.rankCode = rankCode;
    }

    public String getHomeBase() {
        return homeBase;
    }

    public void setHomeBase(String homeBase) {
        this.homeBase = homeBase;
    }

    public String getAircraftQualification() {
        return aircraftQualification;
    }

    public void setAircraftQualification(String aircraftQualification) {
        this.aircraftQualification = aircraftQualification;
    }

    public String getAcclimatizationStatus() {
        return acclimatizationStatus;
    }

    public void setAcclimatizationStatus(String acclimatizationStatus) {
        this.acclimatizationStatus = acclimatizationStatus;
    }

    public String getBodyClockTimezone() {
        return bodyClockTimezone;
    }

    public void setBodyClockTimezone(String bodyClockTimezone) {
        this.bodyClockTimezone = bodyClockTimezone;
    }

    public Integer getNormalCommuteMinutes() {
        return normalCommuteMinutes;
    }

    public void setNormalCommuteMinutes(Integer normalCommuteMinutes) {
        this.normalCommuteMinutes = normalCommuteMinutes;
    }

    public Boolean getExternalEmploymentFlag() {
        return externalEmploymentFlag;
    }

    public void setExternalEmploymentFlag(Boolean externalEmploymentFlag) {
        this.externalEmploymentFlag = externalEmploymentFlag;
    }

    public String getAvailabilityStatus() {
        return availabilityStatus;
    }

    public void setAvailabilityStatus(String availabilityStatus) {
        this.availabilityStatus = availabilityStatus;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public BigDecimal getRollingFlightHours28d() {
        return rollingFlightHours28d;
    }

    public void setRollingFlightHours28d(BigDecimal rollingFlightHours28d) {
        this.rollingFlightHours28d = rollingFlightHours28d;
    }

    public BigDecimal getRollingDutyHours28d() {
        return rollingDutyHours28d;
    }

    public void setRollingDutyHours28d(BigDecimal rollingDutyHours28d) {
        this.rollingDutyHours28d = rollingDutyHours28d;
    }

    public BigDecimal getRollingDutyHours7d() {
        return rollingDutyHours7d;
    }

    public void setRollingDutyHours7d(BigDecimal rollingDutyHours7d) {
        this.rollingDutyHours7d = rollingDutyHours7d;
    }

    public BigDecimal getRollingDutyHours14d() {
        return rollingDutyHours14d;
    }

    public void setRollingDutyHours14d(BigDecimal rollingDutyHours14d) {
        this.rollingDutyHours14d = rollingDutyHours14d;
    }

    public BigDecimal getRollingFlightHours12m() {
        return rollingFlightHours12m;
    }

    public void setRollingFlightHours12m(BigDecimal rollingFlightHours12m) {
        this.rollingFlightHours12m = rollingFlightHours12m;
    }

    public BigDecimal getLatestActualFdpHours() {
        return latestActualFdpHours;
    }

    public void setLatestActualFdpHours(BigDecimal latestActualFdpHours) {
        this.latestActualFdpHours = latestActualFdpHours;
    }

    public String getLatestActualFdpSource() {
        return latestActualFdpSource;
    }

    public void setLatestActualFdpSource(String latestActualFdpSource) {
        this.latestActualFdpSource = latestActualFdpSource;
    }
}
