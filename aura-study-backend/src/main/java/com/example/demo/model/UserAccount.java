package com.example.demo.model;

import jakarta.persistence.*;
import java.util.List;

@Entity
@Table(name = "users")
public class UserAccount {

    @Id
    private String email;
    
    private String name;
    private double focusLogged;
    private int dailyGoalHours;
    private int streak;

    @OneToMany(cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @JoinColumn(name = "user_email")
    private List<Task> tasks;

    public UserAccount() {}

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public double getFocusLogged() { return focusLogged; }
    public void setFocusLogged(double focusLogged) { this.focusLogged = focusLogged; }
    public int getDailyGoalHours() { return dailyGoalHours; }
    public void setDailyGoalHours(int dailyGoalHours) { this.dailyGoalHours = dailyGoalHours; }
    public int getStreak() { return streak; }
    public void setStreak(int streak) { this.streak = streak; }
    public List<Task> getTasks() { return tasks; }
    public void setTasks(List<Task> tasks) { this.tasks = tasks; }
}