package com.pilotroster.system;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "airport_dictionary")
public class AirportDictionary {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "iata_code", nullable = false, length = 3, columnDefinition = "CHAR(3)")
    private String iataCode;

    @Column(name = "name_zh", nullable = false, length = 128)
    private String nameZh;

    @Column(name = "name_en", nullable = false, length = 128)
    private String nameEn;

    @Column(name = "timezone_name", nullable = false, length = 64)
    private String timezoneName;

    @Column(name = "utc_offset_minutes", nullable = false)
    private Integer utcOffsetMinutes;

    @Column(name = "country_code", nullable = false, length = 10)
    private String countryCode;

    @Column(nullable = false, length = 20)
    private String status;

    public Long getId() {
        return id;
    }

    public String getIataCode() {
        return iataCode;
    }

    public void setIataCode(String iataCode) {
        this.iataCode = iataCode;
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

    public String getTimezoneName() {
        return timezoneName;
    }

    public void setTimezoneName(String timezoneName) {
        this.timezoneName = timezoneName;
    }

    public Integer getUtcOffsetMinutes() {
        return utcOffsetMinutes;
    }

    public void setUtcOffsetMinutes(Integer utcOffsetMinutes) {
        this.utcOffsetMinutes = utcOffsetMinutes;
    }

    public String getCountryCode() {
        return countryCode;
    }

    public void setCountryCode(String countryCode) {
        this.countryCode = countryCode;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }
}
