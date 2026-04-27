package com.pilotroster.auth;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "sys_user")
public class SysUser {

    @Id
    private Long id;

    @Column(nullable = false, unique = true)
    private String username;

    @Column(name = "display_name", nullable = false)
    private String displayName;

    @Enumerated(EnumType.STRING)
    @Column(name = "role_code", nullable = false)
    private UserRole roleCode;

    @Column(name = "password_hash")
    private String passwordHash;

    @Column(nullable = false)
    private Boolean enabled;

    @Column(name = "crew_id")
    private Long crewId;

    protected SysUser() {
    }

    public Long getId() {
        return id;
    }

    public String getUsername() {
        return username;
    }

    public String getDisplayName() {
        return displayName;
    }

    public UserRole getRoleCode() {
        return roleCode;
    }

    public String getPasswordHash() {
        return passwordHash;
    }

    public Boolean getEnabled() {
        return enabled;
    }

    public Long getCrewId() {
        return crewId;
    }

    public void setPasswordHash(String passwordHash) {
        this.passwordHash = passwordHash;
    }
}
