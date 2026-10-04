'use client'

import { useState } from 'react'
import { SUBJECTS, DIFFICULTIES } from '@/types/database'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Search, Filter, X } from 'lucide-react'

export interface FilterValues {
  subject?: string
  difficulty?: string
  is_mastered?: boolean
  search?: string
}

interface QuestionFiltersProps {
  filters: FilterValues
  onChange: (filters: FilterValues) => void
}

export function QuestionFilters({ filters, onChange }: QuestionFiltersProps) {
  const [searchInput, setSearchInput] = useState(filters.search || '')

  const handleSubjectChange = (subject: string) => {
    onChange({
      ...filters,
      subject: filters.subject === subject ? undefined : subject,
    })
  }

  const handleDifficultyChange = (difficulty: string) => {
    onChange({
      ...filters,
      difficulty: filters.difficulty === difficulty ? undefined : difficulty,
    })
  }

  const handleMasteredChange = (value: 'all' | 'mastered' | 'pending') => {
    const newFilters = { ...filters }
    if (value === 'all') {
      delete newFilters.is_mastered
    } else {
      newFilters.is_mastered = value === 'mastered'
    }
    onChange(newFilters)
  }

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onChange({
      ...filters,
      search: searchInput.trim() || undefined,
    })
  }

  const handleClearFilters = () => {
    setSearchInput('')
    onChange({})
  }

  const hasActiveFilters =
    filters.subject || filters.difficulty || filters.is_mastered !== undefined || filters.search

  const activeFiltersCount = [
    filters.subject,
    filters.difficulty,
    filters.is_mastered !== undefined,
    filters.search,
  ].filter(Boolean).length

  return (
    <div className="space-y-4 border-b border-[#edf2f7] pb-6">
      {/* 搜索框 */}
      <form onSubmit={handleSearchSubmit} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#64748b] w-4 h-4" />
          <Input
            type="text"
            placeholder="搜索题目内容或知识点..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="h-12 rounded-full border-[#dce8f3] bg-[#fbfdff] pl-11 shadow-none focus-visible:border-[#8bb8ef] focus-visible:ring-[#dcecff]"
          />
        </div>
        <Button type="submit" variant="jelly" className="h-12 rounded-full px-7">
          搜索
        </Button>
      </form>

      {/* 筛选按钮组 */}
      <div className="flex flex-wrap gap-2">
        {/* 学科筛选 */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant={filters.subject ? 'default' : 'outline'}
              size="sm"
              className="gap-2 rounded-full border-[#dce8f3] bg-white px-4 text-[#64748b] hover:border-[#b8d0ea] hover:bg-[#f7fbff] hover:text-[#3577d4]"
            >
              <Filter className="w-4 h-4" />
              学科
              {filters.subject && (
                <span className="text-xs">
                  ({SUBJECTS.find((s) => s.id === filters.subject)?.label})
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48">
            {SUBJECTS.map((subject) => (
              <DropdownMenuCheckboxItem
                key={subject.id}
                checked={filters.subject === subject.id}
                onCheckedChange={() => handleSubjectChange(subject.id)}
              >
                {subject.label}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* 难度筛选 */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant={filters.difficulty ? 'default' : 'outline'}
              size="sm"
              className="gap-2 rounded-full px-4"
            >
              <Filter className="w-4 h-4" />
              难度
              {filters.difficulty && (
                <span className="text-xs">
                  ({DIFFICULTIES.find((d) => d.id === filters.difficulty)?.label})
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-32">
            {DIFFICULTIES.map((difficulty) => (
              <DropdownMenuCheckboxItem
                key={difficulty.id}
                checked={filters.difficulty === difficulty.id}
                onCheckedChange={() => handleDifficultyChange(difficulty.id)}
              >
                {difficulty.label}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* 掌握状态筛选 */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant={filters.is_mastered !== undefined ? 'default' : 'outline'}
              size="sm"
              className="gap-2 rounded-full px-4"
            >
              <Filter className="w-4 h-4" />
              状态
              {filters.is_mastered !== undefined && (
                <span className="text-xs">
                  ({filters.is_mastered ? '已掌握' : '待复习'})
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-32">
            <DropdownMenuCheckboxItem
              checked={filters.is_mastered === undefined}
              onCheckedChange={() => handleMasteredChange('all')}
            >
              全部
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={filters.is_mastered === false}
              onCheckedChange={() => handleMasteredChange('pending')}
            >
              待复习
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={filters.is_mastered === true}
              onCheckedChange={() => handleMasteredChange('mastered')}
            >
              已掌握
            </DropdownMenuCheckboxItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* 清除筛选 */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearFilters}
            className="gap-2 rounded-full text-[#c76a6a] hover:bg-[#fff4f4] hover:text-[#b94e4e]"
          >
            <X className="w-4 h-4" />
            清除筛选 ({activeFiltersCount})
          </Button>
        )}
      </div>
    </div>
  )
}
