"""
Admin configuration for PrepPilot models.
"""
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import (
    User, Exam, Subject, Topic, Resource,
    StudyPlan, StudyBlock, MockTest,
    TopicPerformance, ReadinessScore,
    WhatIfScenario, RecoveryPlan, Notification
)


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ('email', 'username', 'first_name', 'last_name', 'is_staff', 'is_active', 'created_at')
    list_filter = ('is_staff', 'is_superuser', 'is_active', 'ai_assistance_level')
    search_fields = ('email', 'username', 'first_name', 'last_name')
    ordering = ('-created_at',)
    
    fieldsets = BaseUserAdmin.fieldsets + (
        ('Profile', {
            'fields': ('phone', 'date_of_birth', 'avatar', 'timezone')
        }),
        ('Study Preferences', {
            'fields': ('preferred_study_hours_per_day', 'preferred_study_schedule')
        }),
        ('Targets', {
            'fields': ('target_score', 'target_rank', 'target_grade')
        }),
        ('AI Settings', {
            'fields': ('ai_assistance_level',)
        }),
        ('Status', {
            'fields': ('is_onboarded', 'last_active')
        }),
    )
    
    add_fieldsets = BaseUserAdmin.add_fieldsets + (
        ('Additional Info', {
            'fields': ('email', 'first_name', 'last_name')
        }),
    )


@admin.register(Exam)
class ExamAdmin(admin.ModelAdmin):
    list_display = ('name', 'user', 'exam_type', 'exam_date', 'days_remaining', 'is_active', 'is_completed')
    list_filter = ('exam_type', 'is_active', 'is_completed')
    search_fields = ('name', 'user__email', 'conducting_body')
    readonly_fields = ('days_remaining', 'total_study_hours_available', 'created_at', 'updated_at')
    date_hierarchy = 'exam_date'
    ordering = ('exam_date',)


@admin.register(Subject)
class SubjectAdmin(admin.ModelAdmin):
    list_display = ('name', 'exam', 'weightage', 'importance', 'allocated_hours', 'actual_hours_spent', 'preparation_level')
    list_filter = ('importance', 'exam__exam_type')
    search_fields = ('name', 'exam__name')
    ordering = ('exam', 'order')


@admin.register(Topic)
class TopicAdmin(admin.ModelAdmin):
    list_display = ('name', 'subject', 'priority', 'priority_score', 'current_level', 'difficulty', 'estimated_hours', 'is_completed')
    list_filter = ('priority', 'importance', 'difficulty', 'is_completed', 'subject__exam')
    search_fields = ('name', 'subject__name', 'subject__exam__name')
    readonly_fields = ('priority_score', 'created_at', 'updated_at')
    ordering = ('subject', 'order')


@admin.register(Resource)
class ResourceAdmin(admin.ModelAdmin):
    list_display = ('title', 'topic', 'resource_type', 'level', 'is_recommended', 'rating')
    list_filter = ('resource_type', 'level', 'is_recommended', 'topic__subject__exam')
    search_fields = ('title', 'topic__name', 'author')
    ordering = ('topic', 'recommended_sequence')


class StudyBlockInline(admin.TabularInline):
    model = StudyBlock
    extra = 0
    readonly_fields = ('created_at', 'updated_at')
    fields = ('topic', 'block_type', 'order', 'planned_duration', 'actual_duration', 'status', 'completion_percentage')


@admin.register(StudyPlan)
class StudyPlanAdmin(admin.ModelAdmin):
    list_display = ('user', 'exam', 'date', 'total_hours', 'status', 'completion_percentage')
    list_filter = ('status', 'exam__exam_type')
    search_fields = ('user__email', 'exam__name')
    date_hierarchy = 'date'
    inlines = [StudyBlockInline]
    readonly_fields = ('created_at', 'updated_at', 'completed_at')


@admin.register(StudyBlock)
class StudyBlockAdmin(admin.ModelAdmin):
    list_display = ('study_plan', 'topic', 'block_type', 'planned_duration', 'status', 'completion_percentage')
    list_filter = ('block_type', 'status', 'study_plan__exam')
    search_fields = ('topic__name', 'study_plan__user__email')
    readonly_fields = ('created_at', 'updated_at')


@admin.register(MockTest)
class MockTestAdmin(admin.ModelAdmin):
    list_display = ('name', 'user', 'exam', 'scheduled_date', 'status', 'percentage', 'score')
    list_filter = ('status', 'exam__exam_type')
    search_fields = ('name', 'user__email', 'exam__name')
    date_hierarchy = 'scheduled_date'
    readonly_fields = ('created_at', 'updated_at')


@admin.register(TopicPerformance)
class TopicPerformanceAdmin(admin.ModelAdmin):
    list_display = ('user', 'topic', 'questions_attempted', 'accuracy', 'mastery_level', 'revision_count')
    list_filter = ('topic__subject__exam',)
    search_fields = ('user__email', 'topic__name')
    readonly_fields = ('created_at', 'updated_at')


@admin.register(ReadinessScore)
class ReadinessScoreAdmin(admin.ModelAdmin):
    list_display = ('user', 'exam', 'overall_score', 'syllabus_coverage', 'topic_mastery', 'mock_performance', 'calculated_at')
    list_filter = ('exam__exam_type',)
    search_fields = ('user__email', 'exam__name')
    readonly_fields = ('calculated_at',)
    ordering = ('-calculated_at',)


@admin.register(WhatIfScenario)
class WhatIfScenarioAdmin(admin.ModelAdmin):
    list_display = ('name', 'user', 'exam', 'scenario_type', 'projected_readiness', 'feasibility', 'created_at')
    list_filter = ('scenario_type', 'feasibility', 'exam__exam_type')
    search_fields = ('name', 'user__email', 'exam__name')
    readonly_fields = ('created_at', 'updated_at')


@admin.register(RecoveryPlan)
class RecoveryPlanAdmin(admin.ModelAdmin):
    list_display = ('user', 'exam', 'hours_behind', 'is_applied', 'created_at', 'applied_at')
    list_filter = ('is_applied', 'exam__exam_type')
    search_fields = ('user__email', 'exam__name')
    readonly_fields = ('created_at', 'applied_at')


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ('title', 'user', 'notification_type', 'priority', 'is_read', 'created_at')
    list_filter = ('notification_type', 'priority', 'is_read')
    search_fields = ('title', 'message', 'user__email')
    readonly_fields = ('created_at',)
    ordering = ('-created_at',)