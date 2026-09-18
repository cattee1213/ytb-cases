<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { boot, halt } from './reel'

const stage = ref<HTMLDivElement | null>(null)
const layerA = ref<HTMLDivElement | null>(null)
const layerB = ref<HTMLDivElement | null>(null)
const fx = ref<HTMLDivElement | null>(null)
const glow = ref<HTMLDivElement | null>(null)

onMounted(() => {
  const root = stage.value
  const a = layerA.value
  const b = layerB.value
  const g = fx.value
  const light = glow.value
  if (!root || !a || !b || !g || !light) return
  void boot({ stage: root, a, b, fx: g, glow: light })
})

onUnmounted(() => {
  halt()
})
</script>

<template>
  <div class="shell">
    <div ref="stage" class="stage">
      <div ref="layerA" class="plate">
        <img
          alt=""
          draggable="false"
          src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw=="
        />
      </div>
      <div ref="layerB" class="plate">
        <img
          alt=""
          draggable="false"
          src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw=="
        />
      </div>
      <div ref="fx" class="fx" />
      <div ref="glow" class="glow">
        <div class="vignette" />
        <div class="haze" />
        <div class="shock" aria-hidden="true">
          <span class="shock-disc" />
          <span class="shock-k" />
          <span class="shock-m" />
          <span class="shock-c" />
          <span class="shock-w" />
          <span class="shock-echo" />
        </div>
        <div class="sparks">
          <i v-for="n in 16" :key="n" />
        </div>
        <div class="leak" />
        <div class="flare">
          <span class="bar" />
          <span class="core" />
          <span class="orb o1" />
          <span class="orb o2" />
          <span class="orb o3" />
        </div>
        <div class="streak" />
        <div class="flash" />
        <div class="wash" />
        <div class="scan" />
        <div class="grain" />
      </div>
    </div>
  </div>
</template>
