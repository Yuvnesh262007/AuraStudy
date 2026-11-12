package com.example.demo.controller;

import com.example.demo.model.UserAccount;
import com.example.demo.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Optional;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "*")
public class AuraController {

    @Autowired
    private UserRepository userRepository;

    @PostMapping("/login")
    public ResponseEntity<UserAccount> loginUser(@RequestBody UserAccount loginRequest) {
        Optional<UserAccount> existingUser = userRepository.findById(loginRequest.getEmail());
        
        if (existingUser.isPresent()) {
            return ResponseEntity.ok(existingUser.get());
        } else {
            loginRequest.setFocusLogged(0.0);
            loginRequest.setDailyGoalHours(3);
            loginRequest.setStreak(1);
            UserAccount savedUser = userRepository.save(loginRequest);
            return ResponseEntity.ok(savedUser);
        }
    }

    @PutMapping("/update/{email}")
    public ResponseEntity<UserAccount> updateUserData(@PathVariable String email, @RequestBody UserAccount updatedData) {
        Optional<UserAccount> userOpt = userRepository.findById(email);
        
        if (userOpt.isPresent()) {
            UserAccount user = userOpt.get();
            user.setFocusLogged(updatedData.getFocusLogged());
            user.setDailyGoalHours(updatedData.getDailyGoalHours());
            user.setStreak(updatedData.getStreak());
            user.setTasks(updatedData.getTasks());
            
            userRepository.save(user);
            return ResponseEntity.ok(user);
        }
        return ResponseEntity.notFound().build();
    }
}